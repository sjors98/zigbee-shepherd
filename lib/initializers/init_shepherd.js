/* jshint node: true */
'use strict';

var Q = require('q'),
    debug = require('debug')('zigbee-shepherd:init');

var af = require('../components/af'),
    loader = require('../components/loader');

var init = {};

init.setupShepherd = function (shepherd, callback) {
    var deferred = Q.defer(),
        controller = shepherd.controller,
        netInfo;

    debug('zigbee-shepherd booting...');

    controller.start().then(function () {
        shepherd.af = af(controller);
        return controller.request('ZDO', 'mgmtPermitJoinReq', { addrmode: 0x02, dstaddr: 0 , duration: 0, tcsignificance: 0 });
    }).then(function () {
        return shepherd._registerDev(controller.getCoord());
    }).then(function () {
        return loader.reload(shepherd);    // reload all devices from database
    }).then(function() {
        netInfo = controller.getNetInfo();

        debug('Loading devices from database done.');
        debug('zigbee-shepherd is up and ready.');
        debug('Network information:');
        debug(' >> State:      %s', netInfo.state);
        debug(' >> Channel:    %s', netInfo.channel);
        debug(' >> PanId:      %s', netInfo.panId);
        debug(' >> Nwk Addr:   %s', netInfo.nwkAddr);
        debug(' >> Ieee Addr:  %s', netInfo.ieeeAddr);
        debug(' >> Ext. PanId: %s', netInfo.extPanId);
    }).then(function () {
        var devs = shepherd._devbox.exportAllObjs();

        devs.filter(function(dev) {
            return dev.getNwkAddr() !== 0
        }).reduce(function(result, dev) {
            return result
                .then(function() {
                    return Q.delay(Math.random() * 2000);
                })
                .then(function() {
                    return controller.checkOnline(dev);
                }, function() {
                    // ignore rejection
                })
        }, Q());
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

module.exports = init;
