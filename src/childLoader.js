/***************************************************************************************
 * (c) 2017 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 ****************************************************************************************/

/**
 * Loads the child portion of extension bridge. This loader is intended to be hosted on a CDN
 * which extensions will then load. The loader file then loads in the child for that
 * particular environment by incorporating document.referrer into the script URL (see below).
 * The reason this is done is as follows: Assume parent v1 and child v1 are both on production.
 * We then want to release parent v2 and child v2. Assume that parent v2 is incompatible with
 * child v1 and likewise child v2 is incompatible with parent v1. By incompatible, we don't mean
 * that the API the extension is consuming has changed, but rather the ways the parent and child
 * communicate has changed. If we wanted to test an extension in QE using parent v2 and child v2,
 * we would be unable to do so without this loader because the extension would be always be
 * loading child v1 while Lens would be loading parent v2. By using this loader, the extension
 * will load child v2 in qe and we can appropriately test.
 */
(function(window, document, childPath) {
  var bridge = window.extensionBridge = {
    _callQueue: []
  };

  var anchor = document.createElement('a');
  anchor.href = document.referrer;

  var childURL = anchor.protocol +
    '//' +
    anchor.hostname +
    (anchor.port ? ':' + anchor.port : '') +
    childPath;

  [
    'openCodeEditor',
    'openDataElementSelector',
    'openCssSelector',
    'openRegexTester',
    'register',
    'setDebug'
  ].forEach(function(methodName) {
    bridge[methodName] = function() {
      bridge._callQueue.push({
        methodName: methodName,
        args: arguments
      })
    }
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = childURL;

  var firstDocScript = document.getElementsByTagName('script')[0];
  firstDocScript.parentNode.insertBefore(script, firstDocScript);
})(window, document, '/extensionbridge/extensionbridge-child.js');
