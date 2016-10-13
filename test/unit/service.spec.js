describe('Service: Facebook', function () {
  var
    facebook,
    facebookProvider,
    $window,
    $rootScope,
    fbSubscribeEventFunctions,
    fbUnsubscribeEventFunctions,
    getLoginStatusCallback,
    apiCallback,
    loginCallback;

  beforeEach(function () {

    // Load the service's module
    module('facebook', function (_FacebookProvider_) {
      facebookProvider = _FacebookProvider_;
    });

    inject(function (_Facebook_, _$window_, _$rootScope_) {
      facebook = _Facebook_;
      $window = _$window_;
      $rootScope = _$rootScope_;
    });

    fbSubscribeEventFunctions = {};
    fbUnsubscribeEventFunctions = {};

    $window.FB = {
      init: function () {},
      Event: {
        subscribe: function (name, callback) {
          fbSubscribeEventFunctions[name] = callback;
        },
        unsubscribe: function (name, callback) {
          fbUnsubscribeEventFunctions[name] = callback;
        }
      },
      getLoginStatus: function (callback) {
        getLoginStatusCallback = callback;
      },
      api: function (callback) {
        apiCallback = callback;
      },
      login: function (callback) {
        loginCallback = callback;
      },
      XFBML: jasmine.createSpyObj('XFBML', ['parse'])
    };
  });

  it('should throw an error when no trying to initalize and no appId is provided', function() {
    expect(function() {
      $window.fbAsyncInit();
      $rootScope.$apply();
    }).toThrow('Missing appId setting.');
  });

  it('should not throw an error when using login method before initialization', function() {
    var rejectedHandler = jasmine.createSpy('rejectedHandler'),
        result;

    facebook
      .login(angular.noop)
      .catch(rejectedHandler);

    $rootScope.$apply();

    expect(rejectedHandler).not.toHaveBeenCalled();
  });

  describe('after running $window.fbAsyncInit', function() {

    beforeEach(function () {
      facebookProvider.init('123456');
      $window.fbAsyncInit();
      $rootScope.$apply();
    });

    it('isReady should answer with true', function() {
      expect(facebook.isReady()).toBe(true);
    });

    it('should broadcast on $rootScope when facebook event is emitted', inject(function($rootScope) {
      spyOn($rootScope, '$broadcast');
      var cbFn = function() {};
      fbSubscribeEventFunctions['comment.remove'](cbFn);
      $rootScope.$apply();
      expect($rootScope.$broadcast).toHaveBeenCalledWith('Facebook:uncomment', cbFn);
    }));

    it('should be mapped parseXFBML to window.FB.XFBML.parse', inject(function () {
      facebook.parseXFBML();
      $rootScope.$apply();
      expect($window.FB.XFBML.parse).toHaveBeenCalled();
    }));

    it('should map the (un)subscribe method to window.FB.Event', function() {

      var subCallbackFn = jasmine.createSpy('subCallbackFn');
      var subCallbackEmptyResponseFn = jasmine.createSpy('subCallbackEmptyResponseFn');
      var unSubCallbackFn = jasmine.createSpy('unSubCallbackFn');

      var testData = { someUserData: true };

      spyOn($window.FB.Event, 'subscribe').and.callThrough();
      spyOn($window.FB.Event, 'unsubscribe').and.callThrough();

      facebook.subscribe('comment.create', subCallbackEmptyResponseFn);
      facebook.subscribe('edge.remove', subCallbackFn);
      facebook.unsubscribe('edge.remove', unSubCallbackFn);

      $rootScope.$apply();

      fbSubscribeEventFunctions['comment.create'](null);
      fbSubscribeEventFunctions['edge.remove'](testData);
      fbUnsubscribeEventFunctions['edge.remove'](testData);

      $rootScope.$apply();

      expect($window.FB.Event.subscribe.calls.argsFor(0)[0]).toBe('comment.create');
      expect($window.FB.Event.subscribe.calls.argsFor(1)[0]).toBe('edge.remove');
      expect($window.FB.Event.unsubscribe.calls.argsFor(0)[0]).toBe('edge.remove');

      expect(subCallbackFn).toHaveBeenCalledWith(testData);
      expect(unSubCallbackFn).toHaveBeenCalledWith(testData);
      expect(subCallbackEmptyResponseFn).toHaveBeenCalledWith(null);
    });

    it('should map the getLoginStatus/api method to window.FB', function() {

      spyOn($window.FB, 'getLoginStatus').and.callThrough();

      var getLoginStatusCallbackFn = jasmine.createSpy('getLoginStatusCallbackFn');
      var apiCallbackFn = jasmine.createSpy('apiCallbackFn');

      facebook.getLoginStatus(getLoginStatusCallbackFn);
      facebook.api(apiCallbackFn);

      $rootScope.$apply();

      getLoginStatusCallback({ user: true });
      apiCallback(false);

      $rootScope.$apply();

      expect($window.FB.getLoginStatus).toHaveBeenCalled();
      expect(getLoginStatusCallbackFn).toHaveBeenCalled();
    });

    it('should map the login method to window.FB', function() {
      spyOn($window.FB, 'login').and.callThrough();

      var loginCallbackFn = jasmine.createSpy('loginCallbackFn');
      var result;
      var data = { id: 1 };

      facebook.login(loginCallbackFn).then(function (response) {
        result = response;
      });

      $rootScope.$apply();

      loginCallback(data);

      $rootScope.$apply();

      expect($window.FB.login).toHaveBeenCalled();
      expect(loginCallbackFn).toHaveBeenCalled();

      expect(result).toBe(data);

      // --------------------

      facebook
        .login(angular.noop)
        .then(angular.noop, function () {
          result = 'test1';
        });

      $rootScope.$apply();

      loginCallback(undefined);

      $rootScope.$apply();

      expect(result).toBe('test1');
    });
  });
});
