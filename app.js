import config from './config';

const fileUpload = require('express-fileupload');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csv = require('csv');
const json2csv = require('json2csv').parse;
const index = require('./routes/index');
const users = require('./routes/users');
const app = express();
const mysql = require('mysql');

const mysqlOptions = {
  host     : config.mysql.host,
  user     : config.mysql.user,
  password : config.mysql.password,
  database : config.mysql.database,
};

function checkTomboCSV(res, file) {
  // Parsing the CSV
  csv.parse(file.data, function(err, csvData) {
    const connection = mysql.createConnection(mysqlOptions);
    // Connecting to MySQL
    connection.connect();

    // Getting the list of tombos to make the select
    const tombos = csvData.map((row) => {
      return row[0];
    });

    console.log(tombos);

    connection.query(`SELECT id, tombo FROM photos WHERE tombo in (${connection.escape(tombos)})`, function (error, results, fields) {
      if (error) throw error;
      console.log('SOLUTION', results);

      // Mounting the json with the results
      const jsonResult = results.map(result => ({
        id: result.id,
        tombo: result.tombo,
      }));

      // Generating the output csv
      try {
        const csv = json2csv(jsonResult, { fields: ['id', 'tombo'], delimiter: ';' });
        const today = new Date();
        res.attachment(`tombos-checados-${today.toISOString()}.csv`);
        res.status(200).send(csv);
      } catch (err) {
        console.error(err);
        res.send(err);
      }
    });

    connection.end();
  });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(fileUpload());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

app.get('/upload', (req, res) => {
  res.redirect('/');
});

app.post('/upload', function(req, res) {
  const file = req.files.tombosCsv;
  checkTomboCSV(res, file);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
