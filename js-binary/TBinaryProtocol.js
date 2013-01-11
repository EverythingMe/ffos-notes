/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var Thrift = {
  Version : '0.9.0-dev',
  /*
   * Description: 'Binary JavaScript bindings for the Apache Thrift RPC system',
   * License: 'http://www.apache.org/licenses/LICENSE-2.0', Homepage:
   * 'http://thrift.apache.org', BugReports:
   * 'https://issues.apache.org/jira/browse/THRIFT', Maintainer:
   * 'bkepner@evernote.com',
   */

  Type : {
    'STOP' : 0,
    'VOID' : 1,
    'BOOL' : 2,
    'BYTE' : 3,
    'I08' : 3,
    'DOUBLE' : 4,
    'I16' : 6,
    'I32' : 8,
    'I64' : 10,
    'STRING' : 11,
    'UTF7' : 11,
    'STRUCT' : 12,
    'MAP' : 13,
    'SET' : 14,
    'LIST' : 15,
    'UTF8' : 16,
    'UTF16' : 17
  },

  MessageType : {
    'CALL' : 1,
    'REPLY' : 2,
    'EXCEPTION' : 3
  },

  objectLength : function(obj) {
    var length = 0;
    for ( var k in obj) {
      if (obj.hasOwnProperty(k)) {
        length++;
      }
    }

    return length;
  },

  inherits : function(constructor, superConstructor) {
    // Prototypal Inheritance http://javascript.crockford.com/prototypal.html
    function F() {
    }
    F.prototype = superConstructor.prototype;
    constructor.prototype = new F();
  }
};

Thrift.TException = function(message) {
  this.message = message;
};
Thrift.inherits(Thrift.TException, Error);
Thrift.TException.prototype.name = 'TException';

Thrift.TApplicationExceptionType = {
  'UNKNOWN' : 0,
  'UNKNOWN_METHOD' : 1,
  'INVALID_MESSAGE_TYPE' : 2,
  'WRONG_METHOD_NAME' : 3,
  'BAD_SEQUENCE_ID' : 4,
  'MISSING_RESULT' : 5,
  'INTERNAL_ERROR' : 6,
  'PROTOCOL_ERROR' : 7
};

Thrift.TApplicationException = function(message, code) {
  this.message = message;
  this.code = (code === null) ? 0 : code;
};
Thrift.inherits(Thrift.TApplicationException, Thrift.TException);
Thrift.TApplicationException.prototype.name = 'TApplicationException';

Thrift.TApplicationException.prototype.read = function(input) {
  while (1) {
    var ret = input.readFieldBegin();

    if (ret.ftype == Thrift.Type.STOP) {
      break;
    }

    var fid = ret.fid;

    switch (fid) {
    case 1:
      if (ret.ftype == Thrift.Type.STRING) {
        ret = input.readString();
        this.message = ret.value;
      } else {
        ret = input.skip(ret.ftype);
      }
      break;
    case 2:
      if (ret.ftype == Thrift.Type.I32) {
        ret = input.readI32();
        this.code = ret.value;
      } else {
        ret = input.skip(ret.ftype);
      }
      break;
    default:
      ret = input.skip(ret.ftype);
      break;
    }

    input.readFieldEnd();
  }

  input.readStructEnd();
};

Thrift.TApplicationException.prototype.write = function(output) {
  var xfer = 0;

  output.writeStructBegin('TApplicationException');

  if (this.message) {
    output.writeFieldBegin('message', Thrift.Type.STRING, 1);
    output.writeString(this.getMessage());
    output.writeFieldEnd();
  }

  if (this.code) {
    output.writeFieldBegin('type', Thrift.Type.I32, 2);
    output.writeI32(this.code);
    output.writeFieldEnd();
  }

  output.writeFieldStop();
  output.writeStructEnd();
};

Thrift.TApplicationException.prototype.getCode = function() {
  return this.code;
};

Thrift.TApplicationException.prototype.getMessage = function() {
  return this.message;
};

Thrift.TBinaryProtocol = function(aTransport, aStrictRead, aStrictWrite) {
  var transport = aTransport;
  var strictRead = aStrictRead;
  var strictWrite = aStrictWrite;
  var messageSizeLimit;
  var VERSION_1 = 0x80010000;
  var VERSION_MASK = 0xffff0000;

  this.getTransport = function() {
    return transport;
  }

  // TODO: actually test for endianness
  var littleEndian = true;

  /*
   * Takes a Uint8Array representing a single int of arbirary length, and
   * converts it to network order.
   */
  var hton = function(buf) {
    var numBuf = new Uint8Array(buf);
    if (littleEndian) {
      for ( var i = 0; i < numBuf.byteLength / 2; i++) {
        var tmp = numBuf[i];
        numBuf[i] = numBuf[numBuf.byteLength - i - 1];
        numBuf[numBuf.byteLength - i - 1] = tmp;
      }
    }
    return buf;
  };

  var ntoh = hton;

  // UTF8 Encoding/Decoding functions from http://farhadi.ir/works/utf8 under
  // GPL
  var _utf8Encode = function(str) {
    var utf8str = new Array();
    for ( var i = 0; i < str.length; i++) {
      utf8str[i] = code2utf(str.charCodeAt(i));
    }
    return utf8str.join('');
  }

  // Encodes a unicode string to UTF8 format.
  var utf8Encode = function(str) {
    var utf8str = new Array();
    var pos, j = 0;
    var tmpStr = '';

    while ((pos = str.search(/[^\x00-\x7F]/)) != -1) {
      tmpStr = str.match(/([^\x00-\x7F]+[\x00-\x7F]{0,10})+/)[0];
      utf8str[j++] = str.substr(0, pos);
      utf8str[j++] = _utf8Encode(tmpStr);
      str = str.substr(pos + tmpStr.length);
    }

    utf8str[j++] = str;
    return utf8str.join('');
  }

  var _utf8Decode = function(utf8str) {
    var str = new Array();
    var code, code2, code3, code4, j = 0;
    for ( var i = 0; i < utf8str.length;) {
      code = utf8str.charCodeAt(i++);
      if (code > 127)
        code2 = utf8str.charCodeAt(i++);
      if (code > 223)
        code3 = utf8str.charCodeAt(i++);
      if (code > 239)
        code4 = utf8str.charCodeAt(i++);

      if (code < 128)
        str[j++] = chr(code);
      else if (code < 224)
        str[j++] = chr(((code - 192) << 6) + (code2 - 128));
      else if (code < 240)
        str[j++] = chr(((code - 224) << 12) + ((code2 - 128) << 6)
            + (code3 - 128));
      else
        str[j++] = chr(((code - 240) << 18) + ((code2 - 128) << 12)
            + ((code3 - 128) << 6) + (code4 - 128));
    }
    return str.join('');
  }

  // Decodes a UTF8 formated string
  var utf8Decode = function(utf8str) {
    var str = new Array();
    var pos = 0;
    var tmpStr = '';
    var j = 0;
    while ((pos = utf8str.search(/[^\x00-\x7F]/)) != -1) {
      tmpStr = utf8str.match(/([^\x00-\x7F]+[\x00-\x7F]{0,10})+/)[0];
      str[j++] = utf8str.substr(0, pos) + _utf8Decode(tmpStr);
      utf8str = utf8str.substr(pos + tmpStr.length);
    }

    str[j++] = utf8str;
    return str.join('');
  }

  /*
   * Calculate the unsigned 32-bit version of a number.
   */
  var unsign = function(n) {
    if (n < 0) {
      n &= 0x7FFFFFFF;
      n += Math.pow(2, 31);
    }
    return n;
  }

  this.messageSizeLimit = function() {
    return messageSizeLimit;
  }

  this.setMessageSizeLimit = function(limit) {
    messageSizeLimit = limit;
  }

  this.transport = function() {
    return transport;
  }

  this.readStringBody = function(size) {
    var bytes = new Uint8Array(transport.readAtOffsetWithLength(0, size));
    var encoded = "";
    for ( var i = 0; i < bytes.length; i++) {
      encoded += String.fromCharCode(bytes[i]);
    }
    return utf8Decode(encoded);
  }

  this.readMessageBegin = function() {
    var result = {};
    var size = this.readI32();
    if (size < 0) {
      var version = unsign(size & VERSION_MASK);
      if (version != VERSION_1) {
        throw new Error("TProtocolException");
      }
      result.mtype = version & 0x00ff;
      result.fname = this.readString();
      result.rseqid = this.readI32();
    } else {
      if (strictRead) {
        throw "TProtocolException";
      }
      if (this.messageSizeLimit() > 0 && size > this.messageSizeLimit()) {
        throw "TProtocolException";
      }

      result.fname = this.readStringBody(size);
      result.mtype = this.readByte();
      result.rseqid = this.readI32();
    }
    return result;
  }

  this.readMessageEnd = function() {
  };

  this.readStructBegin = function(name) {
  };

  this.readStructEnd = function() {
  };

  this.readFieldBegin = function() {
    var result = {};
    result.ftype = this.readByte();
    if (result.ftype != Thrift.Type.STOP) {
      result.fid = this.readI16();
    }
    return result;
  };

  this.readFieldEnd = function() {
  };

  this.readI32 = function() {
    return new Int32Array(ntoh(transport.readAtOffsetWithLength(0, 4)))[0];
  };

  this.readString = function() {
    var size = this.readI32();
    return this.readStringBody(size);
  };

  this.readBool = function() {
    return this.readByte() == 1;
  };

  this.readByte = function() {
    return new Uint8Array(transport.readAtOffsetWithLength(0, 1))[0];
  };

  this.readI16 = function() {
    return new Int16Array(ntoh(transport.readAtOffsetWithLength(0, 2)))[0];
  };

  /*
   * Javascript doesn't actually support 64 bit ints which poses some problems.
   * First, bitwise operators truncate values to 32 bits, so we have to mimic
   * the bitwise operations with normal math. 2nd, javascript numbers are all
   * actually 64bit floats, which means that any number with more than 56 bits
   * of precision with be truncated.
   */
  this.readI64 = function() {
    var i32a = new Int32Array(ntoh(transport.readAtOffsetWithLength(0, 8)));
    return i32a[0] * Math.pow(2, 32) + unsign(i32a[1]);
  };

  // FIXME: Are these the correct length?
  this.readDouble = function() {
    return new Float64Array(ntoh(transport.readAtOffsetWithLength(0, 8)))[0];
  };

  this.readBinary = function() {
    var size = this.readI32();
    return new Uint8Array(transport.readAtOffsetWithLength(0, size));
  };

  this.readMapBegin = function() {
    var result = {};
    result.ktype = this.readByte();
    result.vtype = this.readByte();
    result.size = this.readI32();
    return result;
  };

  this.readMapEnd = function() {
    this.readFieldEnd();
  };

  this.readSetBegin = function() {
    var result = {};
    result.etype = this.readByte();
    result.size = this.readI32();
    return result;
  };

  this.readSetEnd = function() {
    this.readFieldEnd();
  };

  this.readListBegin = this.readSetBegin;

  this.readListEnd = this.readSetEnd;

  this.skip = function(type) {
    var protocol = this;
    switch (type) {
    case Thrift.Type.BOOL:
      protocol.readBool();
      break;
    case Thrift.Type.BYTE:
      protocol.readByte();
      break;
    case Thrift.Type.I16:
      protocol.readI16();
      break;
    case Thrift.Type.I32:
      protocol.readI32();
      break;
    case Thrift.Type.I64:
      protocol.readI64();
      break;
    case Thrift.Type.DOUBLE:
      protocol.readDouble();
      break;
    case Thrift.Type.STRING:
      protocol.readString();
      break;
    case Thrift.Type.STRUCT:
      protocol.readStructBeginReturningName();
      while (true) {
        var result = protocol.readFieldBeginReturningNameTypeFieldID();
        var fieldType = result.fieldType;
        if (fieldType == Thrift.Type.STOP) {
          break;
        }
        protocol.skip(fieldType, protocol);
        protocol.readFieldEnd();
      }
      protocol.readStructEnd();
      break;
    case Thrift.Type.MAP: {
      var result = protocol.readMapBeginReturningKeyTypeValueTypeSize();
      var keyType = result.ktype;
      var valueType = result.vtype;
      var size = result.size;

      for ( var i = 0; i < size; i++) {
        protocol.skip(keyType, protocol);
        protocol.skip(valueType, protocol);
      }
      protocol.readMapEnd();
    }
      break;
    case Thrift.Type.SET: {
      var result = protocol.readSetBeginReturningElementTypeSize();
      var size = result.size;
      var elemType = result.etype;
      for ( var i = 0; i < size; i++) {
        protocol.skip(elemType, protocol);
      }
      protocol.readSetEnd();
    }
      break;
    case Thrift.Type.LIST: {
      var result = protocol.readListBeginReturningElementTypeSize();
      var size = result.size;
      var elemType = result.etype;
      for ( var i = 0; i < size; i++) {
        protocol.skip(elemType, protocol);
      }
      protocol.readListEnd();
    }
      break;
    default:
      return;
    }
  };

  this.writeByte = function(value) {
    var byte = new Uint8Array(1);
    byte[0] = value;
    transport.writeData(byte, 0, 1);
  };

  this.writeMessageBegin = function(name, messageType, sequenceID) {
    if (strictWrite) {
      var version = VERSION_1 | messageType;
      this.writeI32(version);
      this.writeString(name);
      this.writeI32(sequenceID);
    } else {
      this.writeString(name);
      this.writeByte(messageType);
      this.writeI32(sequenceID);
    }
  };

  this.writeMessageEnd = function() {
  };

  this.writeStructBegin = function(name) {
  };

  this.writeStructEnd = function() {
  };

  this.writeFieldBegin = function(name, fieldType, fieldID) {
    this.writeByte(fieldType);
    this.writeI16(fieldID);
  };

  this.writeI32 = function(value) {
    var buff = new ArrayBuffer(4);
    var numBuff = new Int32Array(buff);
    numBuff[0] = value;
    console.log("Writing I32");
    transport.writeData(hton(buff), 0, 4);
  };

  this.writeI16 = function(value) {
    var buff = new ArrayBuffer(2);
    var numBuff = new Int16Array(buff);
    numBuff[0] = value;
    console.log("Writing I16");
    transport.writeData(hton(buff), 0, 2);
  };

  this.writeI64 = function(value) {
    var buff = new ArrayBuffer(8);
    var i64buff = new Int32Array(buff);
    // Javascript truncates to 32 bits before doing bitwise arithmetic,
    // so this gives us the lower 32 bits.
    var lower = value | 0;
    i64buff[0] = Math.round((value - unsign(lower)) / Math.pow(2, 32));
    i64buff[1] = lower;
    transport.writeData(hton(buff), 0, 8);
  };

  this.writeDouble = function(value) {
    var buff = new ArrayBuffer(8);
    var numBuff = new Float64Array(buff);
    numBuff[0] = value;
    transport.writeData(hton(buff), 0, 8);
  };

  this.writeString = function(s) {
    var encoded = utf8Encode(s);
    var writeBuf = new Uint8Array(encoded.length);
    for ( var i = 0; i < encoded.length; i++) {
      writeBuf[i] = encoded.charCodeAt(i);
    }
    console.log("Writing string of length " + encoded.length);
    this.writeI32(encoded.length);
    transport.writeData(writeBuf, 0, writeBuf.length);
  };

  this.writeBinary = function(value) {
    if (value.constructor == ArrayBuffer) {
      value = new Uint8Array(value);
    }
    this.writeI32(value.length);
    transport.writeData(value, 0, value.length);
  };

  this.writeFieldStop = function() {
    this.writeByte(Thrift.Type.STOP);
  };

  this.writeFieldEnd = function() {
  };

  this.writeMapBegin = function(keyType, valueType, size) {
    this.writeByte(keyType);
    this.writeByte(valueType);
    this.writeI32(size);
  };

  this.writeMapEnd = function() {
  };

  this.writeSetBegin = function(elementType, size) {
    this.writeByte(elementType);
    this.writeI32(size);
  };

  this.writeSetEnd = function() {
  };

  this.writeListBegin = this.writeSetBegin;

  this.writeListEnd = function() {
  };

  this.writeBool = function(value) {
    this.writeByte(value == true ? 1 : 0);
  };
}
