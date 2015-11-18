var extensionBridge = require('lens-extension-bridge/src/extensionBridge')();
var iframeResizer = require('iframe-resizer').iframeResizer;
var frameboyant = require('frameboyant/frameboyant')();

var WindGoggles = function(iframe) {
  this.iframe = iframe;
};

WindGoggles.prototype = {
  initialize: function() {
    frameboyant.addIframe(this.iframe);
    iframeResizer({checkOrigin: false}, this.iframe);
  },

  destroy: function() {
    frameboyant.removeIframe(this.iframe);
    this.iframe.iFrameResizer.close();
  },

  validate: function(schema, callback) {
    return extensionBridge.validate(this.iframe, schema, callback);
  },

  getConfig: function(callback) {
    return extensionBridge.getConfig(this.iframe, callback);
  },

  setConfig: function(config) {
    return extensionBridge.setConfig(this.iframe, config);
  }
};

module.exports = function(iframe) {
  var windGogglesFrame = new WindGoggles(iframe);
  windGogglesFrame.initialize();

  return windGogglesFrame;
};