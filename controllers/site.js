const bluebird = require('bluebird');
const connectionModel = require('../models/connection');

var escapeHtml = function (str) {
  // 对HTML节点中的尖括号（字符）进行转义
  // g: 代表global全量转义
  // #39: ASCII编码
  // 尖括号
  // &: HTML5之后不做转义也没事, 且&的转义只能放最前面, 不然会导致后面的字符二次转义
  str = str.replace(/&/g, '&amp;');
  str = str.replace(/</g, '&lt;');
  str = str.replace(/>/g, '&gt;');

  // 对HTML属性中的字符进行转义
  // 单双引号
  str = str.replace(/"/g, '&quto;');
  str = str.replace(/'/g, '&#39;');
  // 空格
  // 一般不对空格做转义，因html中多个连续空格会显示成一个空格，可能导致排版错误
  // str = str.replace(/ /g, '&#32;');
  return str
}

var escapeForJs = function (str) {
  if (!str) return '';
  // \\: 一个斜杠是转义，一个是符号
  str = str.replace(/\\/g, '\\\\');
  str = str.replace(/"/g, '\\"');
  return str;
}

exports.index = async function (ctx, next) {
  const connection = connectionModel.getConnection();
  const query = bluebird.promisify(connection.query.bind(connection));
  const posts = await query(
    'select post.*,count(comment.id) as commentCount from post left join comment on post.id = comment.postId group by post.id limit 10'
  );
  const comments = await query(
    'select comment.*,post.id as postId,post.title as postTitle,user.username as username from comment left join post on comment.postId = post.id left join user on comment.userId = user.id order by comment.id desc limit 10'
  );
  ctx.render('index', {
    posts,
    comments,
    from: escapeHtml(ctx.query.from) || '',
    // JSON.stringify可用于字符转义
    fromForJs: JSON.stringify(ctx.query.from),
    avatarId: escapeHtml(ctx.query.avatarId) || ''
  });
  connection.end();
};

// 富文本过滤-黑名单过滤
var xssFilter = function (html) {
  if (!html) return '';
  html = html.replace(/<\s*\/?script\s*>/g, '')
  html = html.replace(/javascript:[^'"]*/g, '')
  html = html.replace(/onerror\s*=\s*['"]?[^'"]*['"]/g, '')
  return html
}

exports.post = async function (ctx, next) {
  try {
    console.log('enter post');

    const id = ctx.params.id;
    const connection = connectionModel.getConnection();
    const query = bluebird.promisify(connection.query.bind(connection));
    const posts = await query(
      `select * from post where id = "${id}"`
    );
    let post = posts[0];

    const comments = await query(
      `select comment.*,user.username from comment left join user on comment.userId = user.id where postId = "${post.id}" order by comment.createdAt desc`
    );

    // 将[评论]中的内容进行过滤
    comments.forEach(function (comment) {
      comment.content = xssFilter(comments.content);
    });

    if (post) {
      ctx.render('post', { post, comments });
    } else {
      ctx.status = 404;
    }
    connection.end();
  } catch (e) {
    console.log('[/site/post] error:', e.message, e.stack);
    ctx.body = {
      status: e.code || -1,
      body: e.message
    };
  }
};

exports.addComment = async function (ctx, next) {
  try {
    const data = ctx.request.body;
    const connection = connectionModel.getConnection();
    const query = bluebird.promisify(connection.query.bind(connection));
    const result = await query(
      `insert into comment(userId,postId,content,createdAt) values("${ctx.cookies.get('userId')}", "${data.postId}", "${data.content}","${new Date().toISOString()}")`
    );
    if (result) {
      ctx.redirect(`/post/${data.postId}`);
    } else {
      ctx.body = 'DB操作失败';
    }
  } catch (e) {
    console.log('[/site/addComment] error:', e.message, e.stack);
    ctx.body = {
      status: e.code || -1,
      body: e.message
    };
  }
};
