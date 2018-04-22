const express = require('express')
const compression = require('compression')
const ssl = require('heroku-ssl-redirect')

const port = process.env.PORT || 3000
const app = express()

app.use(ssl())
app.use(compression({
  filter: function(req, res) {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  }
}))

app.use('/docs', express.static('./docs', {
  maxAge: '2w'
}))
app.use('/assets', express.static('./assets', {
  maxAge: '2w'
}))

app.set('view engine', 'pug')
app.set('views', './views')

app.use(function(req, res, next) {
  res.locals = {
    language: 'en',
    supported: {
      en: 'English',
      de: 'German',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      es: 'Spanish',
      ru: 'Russian'
    },
    links: {
      home: function(lang = res.locals.language) {
        return '/' + lang + '/'
      },
      whitepaper: function(lang = res.locals.language) {
        return '/' + lang + '/whitepaper'
      },
      whitelist: function(lang = res.locals.language) {
        return 'https://whitelist.miskre.org' + '/' + lang
      },
      crowdsale: function(lang = res.locals.language) {
        return 'https://crowdsale.miskre.org' + '/' + lang
      },
      pdf: function(lang = res.locals.language) {
        return '/docs/whitepaper.' + lang + '.pdf'
      },
      appstore: '#',
      googleplay: '#',
      medium: 'https://medium.com/miskre',
      slack: 'https://miskre.slack.com',
      telegram: 'https://t.me/miskre'
    },
    __l: function(name, args) {
      switch (typeof res.locals.links[name]) {
        case 'function': return res.locals.links[name](args)
        case 'string':
        default: return res.locals.links[name]
      }
    }
  }
  next()
})

var router = express.Router()
router.get('/', function(req, res) {
  res.render('index')
})
router.get('/whitepaper', function(req, res) {
  res.render('whitepaper')
})

app.use(router)
app.use('/:lang', function(req, res, next) {
  switch (req.params.lang) {
    case 'zh':
    case 'en':
    case 'es':
    case 'ja':
    case 'ko':
    case 'ru':
    case 'de':
      res.locals.language = req.params.lang
      break
    default:
      res.locals.language = 'en'
  }
  next()
}, router)

app.get('*', function(req, res){
  res.redirect('/')
})

app.listen(port)
