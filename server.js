// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

let yaml = require('js-yaml');
let fs   = require('fs');

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments':{
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upVoteComment
  },
  '/comments/:id/downvote':{
    'PUT': downVoteComment
  }
};


function createComment(url, request){
  // the response we will return
  const response = {};
  // info about the comment.
  const requestComment = request.body && request.body.comment;

  //console.log('the request:');
  //console.log(request);

//{ body: 'Comment Body', username: 'existing_user', articleId: 1 }

  // do we have everything we need / is everything valid
  if (requestComment && requestComment.body && database.articles[requestComment.articleId] &&
      requestComment.username && database.users[requestComment.username]){

        // make the comment with the info
        const newComment = {
          id: database.nextCommentId++,
          body: requestComment.body,
          articleId: requestComment.articleId,
          username: requestComment.username,
          upvotedBy: [],
          downvotedBy: []
        };
        // deal with adding the comment
        database.comments[newComment.id] = newComment;

        database.users[newComment.username].commentIds.push(newComment.id);
        database.articles[newComment.articleId].commentIds.push(newComment.id);


        response.body = {comment: newComment};

        response.status = 201;
  }else{
    response.status = 400;
  }
  return response;
}

// update comments
function updateComment(url, request){
  // gets the ID of the comment from the URL
  const id = Number(url.split('/').filter(segment => segment)[1]);
  // store our response
  const response = {};

  // check if the comment ID we got is valid
  if(database.comments[id]){
    if(request.body && request.body.comment && request.body.comment.body !== ''
     && request.body.comment.body){

      // we have a valid comment
      const updatedComment = database.comments[id];

      updatedComment.body = request.body.comment.body;

      database.comments[id].body = request.body.comment.body;

      response.body = {comment: updatedComment};
      response.status = 200;
    }
    else {
      response.status = 400;
    }
  }
  else {
    // didn't get a valid comment, return 404
    response.status = 404;
  }
  return response;
}

// delete comments
function deleteComment(url, request){

  // gets the ID of the comment from the URL
  const id = Number(url.split('/').filter(segment => segment)[1]);

  // store the response
  const response = {};

  // get the comment
  const theComment = database.comments[id];

  // check if a comment with that ID exists
  if(theComment){

    // remove the comment from users and articles
    const commentIds = database.users[theComment.username].commentIds;
    commentIds.splice(commentIds.indexOf(id), 1);
    const articleIds = database.articles[theComment.articleId].commentIds;
    articleIds.splice(articleIds.indexOf(id), 1);

    // remove comment from database
     database.comments[id] = null;

     response.status = 204;
  }else {
    response.status = 404;
  }
  return response;
}

function upVoteComment(url, request){
  // store the response
  const response = {};

  // gets the ID of the comment from the URL
  const id = Number(url.split('/').filter(segment => segment)[1]);

  // get the comment
  let theComment = database.comments[id];

  // get user
  const username = request.body && request.body.username;

  // check if comment and user exist
  if(theComment && database.users[username]){

    // use the existing function to handle doing the upvoting
    theComment = upvote(theComment, username);

    response.body = {comment: theComment};

    response.status = 200;
  }else {
    response.status = 400;
  }
  return response;

}

// basically just a copy of upvote. only need to change
// a small bit of logic
function downVoteComment(url, request){

  // store the response
  const response = {};

  // gets the ID of the comment from the URL
  const id = Number(url.split('/').filter(segment => segment)[1]);

  // get the comment
  let theComment = database.comments[id];

  // get user
  const username = request.body && request.body.username;

  // check if comment and user exist
  if(theComment && database.users[username]){

    // use the existing function to handle doing the upvoting
    theComment = downvote(theComment, username);

    response.body = {comment: theComment};

    response.status = 200;
  }else {
    response.status = 400;
  }
  return response;
}


// So i tried various things and a lot of searching and reading docs, and
// this is what i came up with for the bonus. not super confident about it
// though


// Reads a YAML file containing the database and returns a JavaScript object representing the database
function loadDatabase(){
  try{
    let myObj = {};
    myObj = yaml.safeLoad(fs.readFileSync('./testdata.txt', 'utf8'));
    return myObj;
  }catch (e) {
  console.log(e);
}

}
// Writes the current value of database to a YAML file
function saveDatabase(){


  try{
    fs.writeFileSync('./testdata.txt', database.join(',') , 'utf-8');
  } catch (e) {
  console.log(e);
  }

}




function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', null);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});
