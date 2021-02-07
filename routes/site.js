const Router = require('koa-router');
const router = new Router({
  prefix: ''
});

const site = require('../controllers/site');

router.all('/*', async function (ctx, next) {
  console.log('enter site.js');
  // 以下语句会关闭浏览器XSS自动防御功能, 3个参数：0关闭, 1打开, 在1后面的url（当遇到xss攻击时会向该url发送通知）
  // ctx.set('X-XSS-Protection',0)
  await next();
});

router.get('/', site.index);
router.get('/post/:id', site.post);
router.post('/post/addComment', site.addComment);


module.exports = router;
