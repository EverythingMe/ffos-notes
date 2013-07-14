var params = document.location.search.substring(1).split('&');

if (params.length == 1 && params[0] == '') {
  params = document.location.hash.substring(1).split('&');
}

var result = {};
for (var i = 0; i < params.length; i++) {
  var param = params[i].split('=');
  if (!param || param.length !=2) {
    continue;
  }
  result[param[0]] = param[1];
}

if (window.opener) {
  window.opener.postMessage(result, '*');
  console.log('Sending message to openner : ' + JSON.stringify(result));
} else {
  console.log('Nothing to do here .... ' + JSON.stringify(result));
}