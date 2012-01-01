var ami = require(__dirname + '/../lib');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var MockSocket = function() {
  EventEmitter.call(this);
  this.data = [];
}

util.inherits(MockSocket, EventEmitter);

//emit data on process.nextTick
MockSocket.emitSoon = function(data) {
  var self = this;
  process.nextTick(function() {
    self.emit('data', data);
  })
}

MockSocket.prototype.connect = function(port, host, connectListener) {
  this.port = port;
  if('function' === typeof host) {
    connectListener = host;
  }
  else if('function' === typeof connectListener) {
    this.on('connect', connectListener);
  }
  this.host = host;
}

MockSocket.prototype.write = function(data) {
  this.data.push(data);
}

describe('ami.Client', function() {
  describe('connection', function() {
    describe('success', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);
      var port = 5038;
      var host = 'localhost';

      before(function(done) {
        client.connect(port, host, done);
        socket.emitSoon('connect');
      })

      it('sets socket properties', function() {
        client.socket.port.should.equal(5038);
        client.socket.host.should.equal('localhost');
      })
    })

    describe('error', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);
      var port = 5038;
      var host = 'localhost';
      
      it('emits error', function(done) {
        client.connect(1234);
        client.on('error', function() {
          done();
        });
        process.nextTick(function() {
          socket.emit('error', new Error("fake error"));
        })
      })
    })
  })

  describe('login', function() {
    describe('success', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);

      beforeEach(function() {
        //enqueue a successful login message
        process.nextTick(function(){
          socket.emit('data',Buffer([
            'Response: Success',
            'ActionID: 1',
            'Message: Authentication accepted',
            ''
          ].join('\r\n'),'utf8'))
        })
      })


      it('sends correct login message', function() {
        client.login('user', 'pass', function() {
        })
        socket.data[0].should.equal([
          'ActionID: 1',
          'Action: login',
          'Username: user',
          'Secret: pass','',''].join('\r\n'))
      })

      it('calls callback with no error', function(done) {
        client.login('test', 'boom', done);
      })

      it('emits a login success message', function(done) {
        client.login('test', 'boom', function() { })
        client.on('message', function(msg) {
          return done();
          msg.actionID.should.equal(1);
          msg.response.should.equal('Success');
          msg.message.should.equal('Authentication accepted');
        })
      })
    })
  })
})
