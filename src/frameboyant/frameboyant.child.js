import addStylesToPage from '../utils/addStylesToPage';
import Logger from '../utils/logger';
import UIObserver from '../utils/uiObserver';
import once from 'once';

const logger = new Logger('Frameboyant:Child');

const STYLES = `
  html {
    margin: 0 !important;
    
    /*
      When something in the iframe changes the document height, we send a message to the parent
      window and the window resizes the iframe accordingly. This process is asynchronous,
      however, and while the message is being communicated to the parent window, a vertical
      scrollbar appears. This prevents the scrollbar for showing up.
    */
    overflow: hidden !important;
  }
  
  html, body {
    /*
      Prevent infinite resizing
    */
    height: auto !important;
    background-color: transparent !important;
  }
  
  body {
    /* 
       When in edit mode, we'll be giving body some margin. If the children of body also have 
       margin, this can cause their margins to "collapse" into the body's margin. 
       https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Mastering_margin_collapsing.
       Using padding of 0.1px prevents margins from collapsing while (hopefully) not causing any
       problematic side-effects.
       
       We don't use !important here because it's likely that an extension will legitimately want
       to override padding which is fine though if they set a padding of 0 then margins may
       collapse.
    */
    padding: 0.1px;
    
    margin: 0 !important;
    display: block !important;
    position: relative !important;
    height: 100% !important;
  }

  /*
    Toggling edit mode is an asynchronous operation due to postMessage being asynchronous. While
    toggling, the iframe gets shifted around the parent document at times causing the user to
    see the iframe's content moving around the page. To prevent this from happening, we'll hide
    the body which hopefully will be a better form of flicker. We tried setting visibility to 
    hidden, but it appeared to caus issues with React synthetic events (mousedown, blur, etc)
    after it was unhidden. Tweaking opacity is our best attempt at hiding the content 
    without causing problems.
  */
  .frameboyantTogglingEditMode {
    opacity: 0 !important;
  }
`;

let parent;
let editMode = false;

const handleMouseDown = event => {
  if (editMode) {
    if (event.target === document.documentElement) {
      exitEditMode();
    }
  } else {
    enterEditMode();
  }
};

const setContentRect = rect => {
  const bodyStyle = document.body.style;
  bodyStyle.setProperty('margin-top', `${rect.top}px`, 'important');
  bodyStyle.setProperty('margin-left', `${rect.left}px`, 'important');
  bodyStyle.setProperty('width', `${rect.width}px`, 'important');
  logger.log('content rect set', rect);
};

const clearContentRect = () => {
  const bodyStyle = document.body.style;
  bodyStyle.removeProperty('margin-top');
  bodyStyle.removeProperty('margin-left');
  bodyStyle.removeProperty('width');
  logger.log('content rect cleared');
};

const enterEditMode = () => {
  if (parent && !editMode) {
    logger.log('entering edit mode');
    editMode = true;
    document.body.classList.add('frameboyantTogglingEditMode');

    return parent.editModeEntered().then(contentRect => {
      setContentRect(contentRect);
      document.body.classList.remove('frameboyantTogglingEditMode');
    });
  }
};

const exitEditMode = () => {
  if (parent && editMode) {
    logger.log('exiting edit mode');
    editMode = false;
    document.body.classList.add('frameboyantTogglingEditMode');

    parent.editModeExited().then(() => {
      clearContentRect();
      document.body.classList.remove('frameboyantTogglingEditMode');
    });
  }
};

const handleUIChange = (() => {
  let previousObservedHeight = -1;

  return () => {
    const bodyHeight = document.body.offsetHeight;
    if (previousObservedHeight !== bodyHeight) {
      if (parent) {
        parent.setIframeHeight(bodyHeight);
      }

      previousObservedHeight = bodyHeight;
    }
  };
})();

const uiObserver = new UIObserver(handleUIChange);

const setParent = once(value => {
  parent = value;
  uiObserver.observe();
  handleUIChange(); // Let the parent know about our initial height.
});

document.addEventListener('mousedown', handleMouseDown, true);
addStylesToPage(STYLES);

export default {
  setParent,
  setContentRect,
  exitEditMode
};
