Thrift.TTransportException = function(aName, aReason) {
  var name = aName;
  var reason = aReason;
  
  this.toString = function() {
    return name+": "+reason;
  }
}

Thrift.THTTPClient = function(aURL, aUserAgent, aTimeOut) {
  var userAgent = aUserAgent;
  var url = aURL;
  var timeOut = aTimeOut;
  var request = null;
  var requestData = null;
  var responseData = null;
  var responseDataOffset = 0;

  if (typeof (Blob) === "undefined") {
    throw new Error("Browser does not support binary data transfer");
  }

  if (!ArrayBuffer.prototype.slice) {
    // Some older versions of ArrayBuffer don't support slice
    // TODO: Make this implementation mimic the behavior of the default slice
    // (see:
    // https://developer.mozilla.org/en-US/docs/JavaScript_typed_arrays/ArrayBuffer)
    ArrayBuffer.prototype.slice = function(begin, end) {
      if (arguments.length < 1 || arguments.length > 2) {
        throw new Thrift.TTransportException("Invalid number of arguments to ArrayBuffer.slice");
      }
      if (typeof end === 'undefined' || end > this.length) {
        end = this.length - 1;
      }
      if (begin > end) {
        begin = 0, end = 0;
      }
      var ret = new ArrayBuffer(end - begin);
      for (var i = begin; i < end; i++) {
        ret[i] = this[i];
      }
      return ret;
    }
  }

  this.setupRequest = function() {
    request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.responseType = "arraybuffer";
    request.setRequestHeader("Content-type", "application/x-thrift");
    request.setRequestHeader("Accept", "application/x-thrift");
    responseDataOffset = 0;
    responseData = null;
  };

  this.responseDataOffset = function() {
    return responseDataOffset;
  };

  this.responseData = function() {
    return responseData;
  };

  this.setURL = function(aURL) {
    url = aURL;
  };

  this.readData = function() {
    return this.readAtOffsetWithLength(0, responseData.byteLength);
  };

  this.readAtOffsetWithLength = function(offset, length) {
    if (length == null) {
      throw new Thrift.TTransportException("TTransportException",
          "attempt to read without specifying length");
    }
    if (responseDataOffset > responseData.byteLength) {
      alert("responseDataOffset=" + responseDataOffset
          + ", responseData.length=" + responseData.byteLength);
      throw Error("Offset is greater than the length of the data.");
    }
    var result = responseData.slice(responseDataOffset + offset,
        responseDataOffset + offset + length);
    responseDataOffset += offset + length;
    return result;
  };

  /*
   * offset and length should be specified in bytes.
   */
  this.writeData = function(data, offset, length) {
    var toAppend;
    if (!data) {
      throw new Thrift.TTransportException("TTransportException",
          "attempt to write null data buffer");
    }
    
    // We want to use the array buffer, as it has a standard slice function
    // cross-browser, so if we have an ArrayBufferView variant we use its
    // underlying buffer
    if (typeof data.buffer !== 'undefined') {
      data = data.buffer;
    }
    toAppend = data.slice(offset, offset + length);

    if (requestData == null) {
      requestData = new Array();
    }
    requestData.push(toAppend);
  };

  this.requestData = function() {
    return requestData;
  };

  this.responseData = function() {
    return responseData;
  };

  this.flush = function(callback) {
    this.setupRequest();
    request.onreadystatechange = function() {
      if (request != null && request.readyState == 4) {
        var statusCode = request.status;
        // var headers = request.getAllResponseHeaders();
        responseData = request.response;
        request = null;

        if (statusCode == 200) {
          if (responseData != null && responseData.byteLength > 0) {
            if (typeof callback === 'function') {
              callback();
            }
          } else {
            if (typeof (callback.onError) !== "undefined") {
              var error = new Thrift.TTransportException("TTransportException",
                  "Could not make HTTP request");
              callback.onError(error);
            }
          }
        } else {
          if (typeof (callback.onError) !== "undefined") {
            var error = new Thrift.TTransportException("TTransportException",
                "Bad response from HTTP server: " + statusCode);
            callback.onError(error);
          }
        }
      }
    };
    // requestData is an array of ArrayBufferViews, which
    // the blob constructor should normalize into bytes.
    var requestBlob = new Blob(requestData);

    request.send(requestBlob);
    requestData = null;
  };
}
