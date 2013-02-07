//
// Autogenerated by Thrift Compiler (1.0.0-dev)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

SponsoredGroupRole = {
'GROUP_MEMBER' : 1,
'GROUP_ADMIN' : 2,
'GROUP_OWNER' : 3
};
PublicUserInfo = function(args) {
  this.userId = null;
  this.shardId = null;
  this.privilege = null;
  this.username = null;
  this.noteStoreUrl = null;
  if (args) {
    if (args.userId !== undefined) {
      this.userId = args.userId;
    }
    if (args.shardId !== undefined) {
      this.shardId = args.shardId;
    }
    if (args.privilege !== undefined) {
      this.privilege = args.privilege;
    }
    if (args.username !== undefined) {
      this.username = args.username;
    }
    if (args.noteStoreUrl !== undefined) {
      this.noteStoreUrl = args.noteStoreUrl;
    }
  }
};
PublicUserInfo.prototype = {};
PublicUserInfo.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.userId = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.shardId = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.privilege = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.username = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.noteStoreUrl = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

PublicUserInfo.prototype.write = function(output) {
  output.writeStructBegin('PublicUserInfo');
  if (this.userId !== null && this.userId !== undefined) {
    output.writeFieldBegin('userId', Thrift.Type.I32, 1);
    output.writeI32(this.userId);
    output.writeFieldEnd();
  }
  if (this.shardId !== null && this.shardId !== undefined) {
    output.writeFieldBegin('shardId', Thrift.Type.STRING, 2);
    output.writeString(this.shardId);
    output.writeFieldEnd();
  }
  if (this.privilege !== null && this.privilege !== undefined) {
    output.writeFieldBegin('privilege', Thrift.Type.I32, 3);
    output.writeI32(this.privilege);
    output.writeFieldEnd();
  }
  if (this.username !== null && this.username !== undefined) {
    output.writeFieldBegin('username', Thrift.Type.STRING, 4);
    output.writeString(this.username);
    output.writeFieldEnd();
  }
  if (this.noteStoreUrl !== null && this.noteStoreUrl !== undefined) {
    output.writeFieldBegin('noteStoreUrl', Thrift.Type.STRING, 5);
    output.writeString(this.noteStoreUrl);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

PremiumInfo = function(args) {
  this.currentTime = null;
  this.premium = null;
  this.premiumRecurring = null;
  this.premiumExpirationDate = null;
  this.premiumExtendable = null;
  this.premiumPending = null;
  this.premiumCancellationPending = null;
  this.canPurchaseUploadAllowance = null;
  this.sponsoredGroupName = null;
  this.sponsoredGroupRole = null;
  this.businessName = null;
  this.businessAdmin = null;
  if (args) {
    if (args.currentTime !== undefined) {
      this.currentTime = args.currentTime;
    }
    if (args.premium !== undefined) {
      this.premium = args.premium;
    }
    if (args.premiumRecurring !== undefined) {
      this.premiumRecurring = args.premiumRecurring;
    }
    if (args.premiumExpirationDate !== undefined) {
      this.premiumExpirationDate = args.premiumExpirationDate;
    }
    if (args.premiumExtendable !== undefined) {
      this.premiumExtendable = args.premiumExtendable;
    }
    if (args.premiumPending !== undefined) {
      this.premiumPending = args.premiumPending;
    }
    if (args.premiumCancellationPending !== undefined) {
      this.premiumCancellationPending = args.premiumCancellationPending;
    }
    if (args.canPurchaseUploadAllowance !== undefined) {
      this.canPurchaseUploadAllowance = args.canPurchaseUploadAllowance;
    }
    if (args.sponsoredGroupName !== undefined) {
      this.sponsoredGroupName = args.sponsoredGroupName;
    }
    if (args.sponsoredGroupRole !== undefined) {
      this.sponsoredGroupRole = args.sponsoredGroupRole;
    }
    if (args.businessName !== undefined) {
      this.businessName = args.businessName;
    }
    if (args.businessAdmin !== undefined) {
      this.businessAdmin = args.businessAdmin;
    }
  }
};
PremiumInfo.prototype = {};
PremiumInfo.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I64) {
        this.currentTime = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.BOOL) {
        this.premium = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.BOOL) {
        this.premiumRecurring = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I64) {
        this.premiumExpirationDate = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.premiumExtendable = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.BOOL) {
        this.premiumPending = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.BOOL) {
        this.premiumCancellationPending = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.BOOL) {
        this.canPurchaseUploadAllowance = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.STRING) {
        this.sponsoredGroupName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.I32) {
        this.sponsoredGroupRole = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.STRING) {
        this.businessName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.BOOL) {
        this.businessAdmin = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

PremiumInfo.prototype.write = function(output) {
  output.writeStructBegin('PremiumInfo');
  if (this.currentTime !== null && this.currentTime !== undefined) {
    output.writeFieldBegin('currentTime', Thrift.Type.I64, 1);
    output.writeI64(this.currentTime);
    output.writeFieldEnd();
  }
  if (this.premium !== null && this.premium !== undefined) {
    output.writeFieldBegin('premium', Thrift.Type.BOOL, 2);
    output.writeBool(this.premium);
    output.writeFieldEnd();
  }
  if (this.premiumRecurring !== null && this.premiumRecurring !== undefined) {
    output.writeFieldBegin('premiumRecurring', Thrift.Type.BOOL, 3);
    output.writeBool(this.premiumRecurring);
    output.writeFieldEnd();
  }
  if (this.premiumExpirationDate !== null && this.premiumExpirationDate !== undefined) {
    output.writeFieldBegin('premiumExpirationDate', Thrift.Type.I64, 4);
    output.writeI64(this.premiumExpirationDate);
    output.writeFieldEnd();
  }
  if (this.premiumExtendable !== null && this.premiumExtendable !== undefined) {
    output.writeFieldBegin('premiumExtendable', Thrift.Type.BOOL, 5);
    output.writeBool(this.premiumExtendable);
    output.writeFieldEnd();
  }
  if (this.premiumPending !== null && this.premiumPending !== undefined) {
    output.writeFieldBegin('premiumPending', Thrift.Type.BOOL, 6);
    output.writeBool(this.premiumPending);
    output.writeFieldEnd();
  }
  if (this.premiumCancellationPending !== null && this.premiumCancellationPending !== undefined) {
    output.writeFieldBegin('premiumCancellationPending', Thrift.Type.BOOL, 7);
    output.writeBool(this.premiumCancellationPending);
    output.writeFieldEnd();
  }
  if (this.canPurchaseUploadAllowance !== null && this.canPurchaseUploadAllowance !== undefined) {
    output.writeFieldBegin('canPurchaseUploadAllowance', Thrift.Type.BOOL, 8);
    output.writeBool(this.canPurchaseUploadAllowance);
    output.writeFieldEnd();
  }
  if (this.sponsoredGroupName !== null && this.sponsoredGroupName !== undefined) {
    output.writeFieldBegin('sponsoredGroupName', Thrift.Type.STRING, 9);
    output.writeString(this.sponsoredGroupName);
    output.writeFieldEnd();
  }
  if (this.sponsoredGroupRole !== null && this.sponsoredGroupRole !== undefined) {
    output.writeFieldBegin('sponsoredGroupRole', Thrift.Type.I32, 10);
    output.writeI32(this.sponsoredGroupRole);
    output.writeFieldEnd();
  }
  if (this.businessName !== null && this.businessName !== undefined) {
    output.writeFieldBegin('businessName', Thrift.Type.STRING, 11);
    output.writeString(this.businessName);
    output.writeFieldEnd();
  }
  if (this.businessAdmin !== null && this.businessAdmin !== undefined) {
    output.writeFieldBegin('businessAdmin', Thrift.Type.BOOL, 12);
    output.writeBool(this.businessAdmin);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AuthenticationResult = function(args) {
  this.currentTime = null;
  this.authenticationToken = null;
  this.expiration = null;
  this.user = null;
  this.publicUserInfo = null;
  this.noteStoreUrl = null;
  this.webApiUrlPrefix = null;
  if (args) {
    if (args.currentTime !== undefined) {
      this.currentTime = args.currentTime;
    }
    if (args.authenticationToken !== undefined) {
      this.authenticationToken = args.authenticationToken;
    }
    if (args.expiration !== undefined) {
      this.expiration = args.expiration;
    }
    if (args.user !== undefined) {
      this.user = args.user;
    }
    if (args.publicUserInfo !== undefined) {
      this.publicUserInfo = args.publicUserInfo;
    }
    if (args.noteStoreUrl !== undefined) {
      this.noteStoreUrl = args.noteStoreUrl;
    }
    if (args.webApiUrlPrefix !== undefined) {
      this.webApiUrlPrefix = args.webApiUrlPrefix;
    }
  }
};
AuthenticationResult.prototype = {};
AuthenticationResult.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I64) {
        this.currentTime = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.authenticationToken = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.expiration = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.user = new User();
        this.user.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRUCT) {
        this.publicUserInfo = new PublicUserInfo();
        this.publicUserInfo.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.noteStoreUrl = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.webApiUrlPrefix = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AuthenticationResult.prototype.write = function(output) {
  output.writeStructBegin('AuthenticationResult');
  if (this.currentTime !== null && this.currentTime !== undefined) {
    output.writeFieldBegin('currentTime', Thrift.Type.I64, 1);
    output.writeI64(this.currentTime);
    output.writeFieldEnd();
  }
  if (this.authenticationToken !== null && this.authenticationToken !== undefined) {
    output.writeFieldBegin('authenticationToken', Thrift.Type.STRING, 2);
    output.writeString(this.authenticationToken);
    output.writeFieldEnd();
  }
  if (this.expiration !== null && this.expiration !== undefined) {
    output.writeFieldBegin('expiration', Thrift.Type.I64, 3);
    output.writeI64(this.expiration);
    output.writeFieldEnd();
  }
  if (this.user !== null && this.user !== undefined) {
    output.writeFieldBegin('user', Thrift.Type.STRUCT, 4);
    this.user.write(output);
    output.writeFieldEnd();
  }
  if (this.publicUserInfo !== null && this.publicUserInfo !== undefined) {
    output.writeFieldBegin('publicUserInfo', Thrift.Type.STRUCT, 5);
    this.publicUserInfo.write(output);
    output.writeFieldEnd();
  }
  if (this.noteStoreUrl !== null && this.noteStoreUrl !== undefined) {
    output.writeFieldBegin('noteStoreUrl', Thrift.Type.STRING, 6);
    output.writeString(this.noteStoreUrl);
    output.writeFieldEnd();
  }
  if (this.webApiUrlPrefix !== null && this.webApiUrlPrefix !== undefined) {
    output.writeFieldBegin('webApiUrlPrefix', Thrift.Type.STRING, 7);
    output.writeString(this.webApiUrlPrefix);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BootstrapSettings = function(args) {
  this.serviceHost = null;
  this.marketingUrl = null;
  this.supportUrl = null;
  this.accountEmailDomain = null;
  this.enableFacebookSharing = null;
  this.enableGiftSubscriptions = null;
  this.enableSupportTickets = null;
  this.enableSharedNotebooks = null;
  this.enableSingleNoteSharing = null;
  this.enableSponsoredAccounts = null;
  this.enableTwitterSharing = null;
  this.enableLinkedInSharing = null;
  if (args) {
    if (args.serviceHost !== undefined) {
      this.serviceHost = args.serviceHost;
    }
    if (args.marketingUrl !== undefined) {
      this.marketingUrl = args.marketingUrl;
    }
    if (args.supportUrl !== undefined) {
      this.supportUrl = args.supportUrl;
    }
    if (args.accountEmailDomain !== undefined) {
      this.accountEmailDomain = args.accountEmailDomain;
    }
    if (args.enableFacebookSharing !== undefined) {
      this.enableFacebookSharing = args.enableFacebookSharing;
    }
    if (args.enableGiftSubscriptions !== undefined) {
      this.enableGiftSubscriptions = args.enableGiftSubscriptions;
    }
    if (args.enableSupportTickets !== undefined) {
      this.enableSupportTickets = args.enableSupportTickets;
    }
    if (args.enableSharedNotebooks !== undefined) {
      this.enableSharedNotebooks = args.enableSharedNotebooks;
    }
    if (args.enableSingleNoteSharing !== undefined) {
      this.enableSingleNoteSharing = args.enableSingleNoteSharing;
    }
    if (args.enableSponsoredAccounts !== undefined) {
      this.enableSponsoredAccounts = args.enableSponsoredAccounts;
    }
    if (args.enableTwitterSharing !== undefined) {
      this.enableTwitterSharing = args.enableTwitterSharing;
    }
    if (args.enableLinkedInSharing !== undefined) {
      this.enableLinkedInSharing = args.enableLinkedInSharing;
    }
  }
};
BootstrapSettings.prototype = {};
BootstrapSettings.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.serviceHost = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.marketingUrl = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.supportUrl = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.accountEmailDomain = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.enableFacebookSharing = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.BOOL) {
        this.enableGiftSubscriptions = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.BOOL) {
        this.enableSupportTickets = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.BOOL) {
        this.enableSharedNotebooks = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.BOOL) {
        this.enableSingleNoteSharing = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.BOOL) {
        this.enableSponsoredAccounts = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.BOOL) {
        this.enableTwitterSharing = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.BOOL) {
        this.enableLinkedInSharing = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

BootstrapSettings.prototype.write = function(output) {
  output.writeStructBegin('BootstrapSettings');
  if (this.serviceHost !== null && this.serviceHost !== undefined) {
    output.writeFieldBegin('serviceHost', Thrift.Type.STRING, 1);
    output.writeString(this.serviceHost);
    output.writeFieldEnd();
  }
  if (this.marketingUrl !== null && this.marketingUrl !== undefined) {
    output.writeFieldBegin('marketingUrl', Thrift.Type.STRING, 2);
    output.writeString(this.marketingUrl);
    output.writeFieldEnd();
  }
  if (this.supportUrl !== null && this.supportUrl !== undefined) {
    output.writeFieldBegin('supportUrl', Thrift.Type.STRING, 3);
    output.writeString(this.supportUrl);
    output.writeFieldEnd();
  }
  if (this.accountEmailDomain !== null && this.accountEmailDomain !== undefined) {
    output.writeFieldBegin('accountEmailDomain', Thrift.Type.STRING, 4);
    output.writeString(this.accountEmailDomain);
    output.writeFieldEnd();
  }
  if (this.enableFacebookSharing !== null && this.enableFacebookSharing !== undefined) {
    output.writeFieldBegin('enableFacebookSharing', Thrift.Type.BOOL, 5);
    output.writeBool(this.enableFacebookSharing);
    output.writeFieldEnd();
  }
  if (this.enableGiftSubscriptions !== null && this.enableGiftSubscriptions !== undefined) {
    output.writeFieldBegin('enableGiftSubscriptions', Thrift.Type.BOOL, 6);
    output.writeBool(this.enableGiftSubscriptions);
    output.writeFieldEnd();
  }
  if (this.enableSupportTickets !== null && this.enableSupportTickets !== undefined) {
    output.writeFieldBegin('enableSupportTickets', Thrift.Type.BOOL, 7);
    output.writeBool(this.enableSupportTickets);
    output.writeFieldEnd();
  }
  if (this.enableSharedNotebooks !== null && this.enableSharedNotebooks !== undefined) {
    output.writeFieldBegin('enableSharedNotebooks', Thrift.Type.BOOL, 8);
    output.writeBool(this.enableSharedNotebooks);
    output.writeFieldEnd();
  }
  if (this.enableSingleNoteSharing !== null && this.enableSingleNoteSharing !== undefined) {
    output.writeFieldBegin('enableSingleNoteSharing', Thrift.Type.BOOL, 9);
    output.writeBool(this.enableSingleNoteSharing);
    output.writeFieldEnd();
  }
  if (this.enableSponsoredAccounts !== null && this.enableSponsoredAccounts !== undefined) {
    output.writeFieldBegin('enableSponsoredAccounts', Thrift.Type.BOOL, 10);
    output.writeBool(this.enableSponsoredAccounts);
    output.writeFieldEnd();
  }
  if (this.enableTwitterSharing !== null && this.enableTwitterSharing !== undefined) {
    output.writeFieldBegin('enableTwitterSharing', Thrift.Type.BOOL, 11);
    output.writeBool(this.enableTwitterSharing);
    output.writeFieldEnd();
  }
  if (this.enableLinkedInSharing !== null && this.enableLinkedInSharing !== undefined) {
    output.writeFieldBegin('enableLinkedInSharing', Thrift.Type.BOOL, 12);
    output.writeBool(this.enableLinkedInSharing);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BootstrapProfile = function(args) {
  this.name = null;
  this.settings = null;
  if (args) {
    if (args.name !== undefined) {
      this.name = args.name;
    }
    if (args.settings !== undefined) {
      this.settings = args.settings;
    }
  }
};
BootstrapProfile.prototype = {};
BootstrapProfile.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.settings = new BootstrapSettings();
        this.settings.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

BootstrapProfile.prototype.write = function(output) {
  output.writeStructBegin('BootstrapProfile');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.settings !== null && this.settings !== undefined) {
    output.writeFieldBegin('settings', Thrift.Type.STRUCT, 2);
    this.settings.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BootstrapInfo = function(args) {
  this.profiles = null;
  if (args) {
    if (args.profiles !== undefined) {
      this.profiles = args.profiles;
    }
  }
};
BootstrapInfo.prototype = {};
BootstrapInfo.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size0 = 0;
        var _rtmp34;
        this.profiles = [];
        var _etype3 = 0;
        _rtmp34 = input.readListBegin();
        _etype3 = _rtmp34.etype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var elem6 = null;
          elem6 = new BootstrapProfile();
          elem6.read(input);
          this.profiles.push(elem6);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

BootstrapInfo.prototype.write = function(output) {
  output.writeStructBegin('BootstrapInfo');
  if (this.profiles !== null && this.profiles !== undefined) {
    output.writeFieldBegin('profiles', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.profiles.length);
    for (var iter7 in this.profiles)
    {
      if (this.profiles.hasOwnProperty(iter7))
      {
        iter7 = this.profiles[iter7];
        iter7.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

EDAM_VERSION_MAJOR = 1;
EDAM_VERSION_MINOR = 22;