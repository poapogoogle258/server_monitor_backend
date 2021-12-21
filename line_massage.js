function send_message(message) {
    var axios = require('axios');
    var qs = require('qs');
    var data = qs.stringify({
      'message': message 
    });
    var config = {
      method: 'post',
      url: 'https://notify-api.line.me/api/notify',
      headers: { 
        'Authorization': 'Bearer B6yPj7gOCjsVuhn9MhZjbYgqwwcnM3AxrQRhDtt3MvU', 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data : data
    };
  
    axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
}

module.exports = send_message