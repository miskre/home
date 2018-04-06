const express = require('express')
const compression = require('compression')
const auth = require('express-basic-auth')

const port = process.env.PORT || 3000
const app = express()

app.use(auth({
  users: {
    'mis': 'kre',
    'gia': ''
  }
}))
app.use(compression())
app.use(express.static('.'))

app.listen(port)
