//  OpenShift sample Node application
var express = require('express'),
  app = express(),
  morgan = require('morgan');

var needle = require('needle');
var cheerio = require('cheerio');
const bodyParser = require('body-parser');

const parseForum = url => {
  return new Promise((resolve, reject) => {
    needle.get(url, (err, res) => {
      if (err) reject(err);

      const $ = cheerio.load(res.body);
      let forumData = [];
      $('#forums')
        .children('li')
        .toArray()
        .forEach(topic => {
          const forumSelector = topic.attribs.id ? topic.attribs.id : 'forums';
          let title = $(
            `#${forumSelector.replace(
              new RegExp('[.]', 'g'),
              '\\.'
            )} .nodeInfo.categoryNodeInfo.categoryStrip .nodeTitle a`
          ).text();
          let forumsData = [];
          if (forumData.length === 0 || forumSelector !== 'forums') {
            $(`#${forumSelector.replace(new RegExp('[.]', 'g'), '\\.')}${forumSelector !== 'forums' ? ' ol' : ''}`)
              .children('li')
              .toArray()
              .forEach(node => {
                let queryItem = `#${forumSelector.replace(new RegExp('[.]', 'g'), '\\.')} .${node.attribs.class
                  .replace(new RegExp('\\s\\s', 'g'), '.')
                  .replace(new RegExp('\\s', 'g'), '.')}`;
                console.log(
                  $(`${queryItem} .nodeTitle a`)
                    .first()
                    .text()
                );
                if (
                  $(queryItem)
                    .parent()
                    .hasClass('nodeList')
                ) {
                  forumsData.push({
                    title: $(`${queryItem} .nodeTitle a`)
                      .first()
                      .text(),
                    link: $(`${queryItem} .nodeTitle a`)
                      .first()
                      .attr()['href'],
                    themes: $(`${queryItem} .nodeStats.pairsInline`)
                      .children('dl')
                      .first()
                      .children('dd')
                      .text(),
                    messages: $(`${queryItem} .nodeStats.pairsInline`)
                      .children('dl')
                      .last()
                      .children('dd')
                      .text(),
                    isLastMessage: !!$(`${queryItem} .nodeLastPost.secondaryContent .lastThreadUser`).attr(),
                    lastMessage: !!$(`${queryItem} .nodeLastPost.secondaryContent .lastThreadUser`).attr()
                      ? {
                          title: $(`${queryItem} .nodeLastPost.secondaryContent .lastThreadTitle a`).text(),
                          author: {
                            name: $(
                              `${queryItem} .nodeLastPost.secondaryContent .lastThreadMeta .lastThreadUser a`
                            ).text(),
                            link: $(
                              `${queryItem} .nodeLastPost.secondaryContent .lastThreadMeta .lastThreadUser a`
                            ).attr()['href']
                          },
                          data: $(`${queryItem} .nodeLastPost.secondaryContent .DateTime`).text()
                        }
                      : null
                  });
                }
              });
          }
          forumData.push({
            title,
            forumsData
          });
        });
      resolve(forumData);
    });
  });
};

const parseDiscussion = url => {
  return new Promise((resolve, rejcet) => {
    needle.get(url, (err, res) => {
      if (err) rejcet(err);

      const $ = cheerio.load(res.body);
      let discussionList = [];
      $('.discussionList.section.sectionMain .discussionListItems')
        .children('li')
        .toArray()
        .forEach(discussionItem => {
          if (
            $(`#${discussionItem.attribs.id} .title a`)
              .last()
              .text()
          ) {
            console.log(
              $(`#${discussionItem.attribs.id} .title a`)
                .last()
                .text()
            );
            discussionList.push({
              title: $(`#${discussionItem.attribs.id} .title a`)
                .last()
                .text(),
              link: $(`#${discussionItem.attribs.id} .title a`).attr()['href'],
              isImportant:
                $(`#${discussionItem.attribs.id} .title a`)
                  .first()
                  .text()
                  .toLocaleLowerCase() === 'важно',
              isLocked: $(`#${discussionItem.attribs.id}`).hasClass('locked'),
              isSticky: !!$(`#${discussionItem.attribs.id}`).hasClass('sticky'),
              answers: $(`#${discussionItem.attribs.id} .listBlock.stats.pairsJustified .major dd`).text(),
              views: $(`#${discussionItem.attribs.id} .listBlock.stats.pairsJustified .minor dd`).text(),
              date: $(`#${discussionItem.attribs.id} .DateTime`)
                .first()
                .text(),
              author: {
                name: $(`#${discussionItem.attribs.id} .username`)
                  .first()
                  .text(),
                link: $(`#${discussionItem.attribs.id} .username`).attr()['href'],
                avatar: $(`#${discussionItem.attribs.id} .avatarContainer img`).attr()['src']
              }
            });
          }
        });
      if ($('#forums')) {
        parseForum(url).then(forums => {
          resolve({
            discussionList,
            forums
          });
        });
      } else {
        resolve({
          discussionList
        });
      }
    });
  });
};

const parseMessages = url => {
  return new Promise((resolve, rejcet) => {
    needle.get(url, (err, res) => {
      if (err) rejcet(err);

      const $ = cheerio.load(res.body);
      let messages = [];
      $('#messageList')
        .children('li')
        .toArray()
        .forEach(message => {
          console.log($(`#${message.attribs.id} .publicControls a`).text());
          let status = [];
          $(`#${message.attribs.id} .userText`)
            .children('em')
            .toArray()
            .forEach(stat => {
              status.push(
                $(
                  `#${message.attribs.id} .userText .${stat.attribs.class
                    .replace(new RegExp('\\s\\s', 'g'), '.')
                    .replace(new RegExp('\\s', 'g'), '.')} strong`
                ).text()
              );
            });
          messages.push({
            content: $(`#${message.attribs.id} .messageContent`)
              .html()
              .trim()
              .replace(new RegExp('[\t\n]', 'g'), ''),
            number: $(`#${message.attribs.id} .publicControls a`).text(),
            likes: $(`#${message.attribs.id} .LikeText`)
              .text()
              .trim(),
            date: $(`#${message.attribs.id} .messageMeta.ToggleTriggerAnchor .DateTime`).text(),
            author: {
              name: $(`#${message.attribs.id} .userText a`).text(),
              link: $(`#${message.attribs.id} .userText a`).attr()['href'],
              status,
              avatar: $(`#${message.attribs.id} .avatar img`).attr()['src'],
              additionalInfo: $(`#${message.attribs.id} .extraUserInfo`)
                .text()
                .trim()
                .replace(new RegExp('[\t]', 'g'), '')
                .split('\n')
                .filter(item => item.length > 0)
            }
          });
        });
      resolve({ messages });
    });
  });
};

Object.assign = require('object-assign');

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'));
app.use(bodyParser.json());

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = '';

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

    // If using env vars from secret from service binding
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split('//');
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(':');
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
  dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(
    mongoURL,
    function(err, conn) {
      if (err) {
        callback(err);
        return;
      }

      db = conn;
      dbDetails.databaseName = db.databaseName;
      dbDetails.url = mongoURLLabel;
      dbDetails.type = 'MongoDB';

      console.log('Connected to MongoDB at: %s', mongoURL);
    }
  );
};

app.get('/', function(req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err) {});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ ip: req.ip, date: Date.now() });
    col.count(function(err, count) {
      if (err) {
        console.log('Error running count. Message:\n' + err);
      }
      res.render('index.html', { pageCountMessage: count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage: null });
  }
});

app.post('/parseForum', (req, res, next) => {
  const url = req.body.url;
  parseForum(url).then(data => {
    res.json({
      body: {
        data
      }
    });
  });
});

app.post('/parseDiscussion', (req, res, next) => {
  const url = req.body.url;
  parseDiscussion(url).then(data => {
    res.json({
      body: {
        data
      }
    });
  });
});

app.post('/parseMessages', (req, res, next) => {
  const url = req.body.url;
  parseMessages(url).then(data => {
    res.json({
      body: {
        data
      }
    });
  });
});

// error handling
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err) {
  console.log('Error connecting to Mongo. Message:\n' + err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;
