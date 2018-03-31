const express = require('express')
const compression = require('compression')

const port = process.env.PORT || 3000
const app = express()

app.use(compression())
app.use(express.static('.'))

app.listen(port)
