import docOffset from 'document-offset';
import addStylesToPage from '../utils/addStylesToPage';
import UIObserver from '../utils/uiObserver';
import Logger from '../utils/logger';

const logger = new Logger('Frameboyant:Parent');

const STYLES = `
  .frameboyantIframe {
    box-sizing: border-box;
    width: 100%;
  }
  
  .frameboyantIframeContainer {
    width: 100%;
    height: 100%;
  }
    
  .frameboyantRoot.editMode .frameboyantIframeContainer {
    position: absolute;
    /* Width and height will be inlined as necessary */
    width: auto;
    height: auto;
  }
  
  .frameboyantIframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

addStylesToPage(STYLES);

const getOffsetFromDocument = element => {
  const rect = element.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
};

export default editModeZIndex => {
  logger.log('Initializing an iframe');

  let child;

  const root = document.createElement('div');
  root.classList.add('frameboyantRoot');

  const iframeContainer = document.createElement('div');
  iframeContainer.classList.add('frameboyantIframeContainer');
  root.appendChild(iframeContainer);

  const getIframeContentRect = () => {
    const { top, left } = docOffset(root);
    const { width } = root.getBoundingClientRect();

    return {
      top,
      left,
      width,
    };
  };

  const updateDomForEditMode = () => {
    const iframeContainerStyle = iframeContainer.style;
    const offsetParent = iframeContainer.offsetParent;
    const offsetFromDoc = getOffsetFromDocument(offsetParent);
    const offsetWidth = offsetParent.offsetWidth;
    const offsetHeight = offsetParent.offsetHeight;

    root.classList.add('editMode');
    iframeContainerStyle.zIndex = editModeZIndex;
    iframeContainerStyle.top = -offsetFromDoc.top + 'px';
    iframeContainerStyle.left = -offsetFromDoc.left + 'px';
    iframeContainerStyle.right = -(document.documentElement.offsetWidth - offsetFromDoc.left - offsetWidth) + 'px';
    iframeContainerStyle.bottom = -(document.documentElement.offsetHeight - offsetFromDoc.top - offsetHeight) + 'px';
  };

  const updateDomForNormalMode = () => {
    const iframeContainerStyle = iframeContainer.style;

    root.classList.remove('editMode');
    iframeContainerStyle.removeProperty('z-index');
    iframeContainerStyle.removeProperty('top');
    iframeContainerStyle.removeProperty('left');
    iframeContainerStyle.removeProperty('right');
    iframeContainerStyle.removeProperty('bottom');
  };

  // Watch for any UI mutations in the parent window. If any are seen, we need to update the
  // content position inside the iframe. This is only necessary when we're in edit mode.
  const uiObserver = new UIObserver(() => {
    logger.log('UI mutation observed');
    updateDomForEditMode();
    child.setContentRect(getIframeContentRect());
  });

  return {
    root,
    iframeContainer,
    setChild(value) {
      child = value;
      child.iframe.classList.add('frameboyantIframe');
      iframeContainer.appendChild(child.iframe);
    },
    activateEditMode() {
      logger.log('Activating edit mode');
      updateDomForEditMode();
      uiObserver.observe();
      return getIframeContentRect();
    },
    deactivateEditMode() {
      logger.log('Deactivating edit mode');
      uiObserver.disconnect();
      updateDomForNormalMode();
    },
    setIframeHeight(height) {
      logger.log('Setting iframe height', height);
      root.style.height = height + 'px';
    },
    destroy() {
      uiObserver.disconnect();

      if (root.parentNode) {
        root.parentNode.removeChild(root);
      }
    }
  };
};
