/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/test.js":
/*!*********************!*\
  !*** ./src/test.js ***!
  \*********************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Tawk\": function() { return /* binding */ Tawk; }\n/* harmony export */ });\nconsole.log('asdasd')\nclass Tawk {\n  constructor({ position = 'bottom-right' }) {\n    this.position = this.getPosition(position)\n    this.open = false\n    this.initialise()\n    this.createStyles()\n  }\n\n  getPosition(position) {\n    const [vertical, horizontal] = position.split('-')\n    return {\n      [vertical]: '30px',\n      [horizontal]: '30px',\n    }\n  }\n\n  initialise() {\n    const container = document.createElement('div')\n    container.style.position = 'fixed'\n    Object.keys(this.position).forEach(\n      (key) => (container.style[key] = this.position[key])\n    )\n    document.body.appendChild(container)\n\n    const buttonContainer = document.createElement('div')\n    buttonContainer.classList.add('button-container')\n\n    const chatIcon = document.createElement('img')\n    chatIcon.src = 'assets/chat.svg'\n    chatIcon.classList.add('icon')\n    this.chatIcon = chatIcon\n\n    const closeIcon = document.createElement('img')\n    closeIcon.src = 'assets/cross.svg'\n    closeIcon.classList.add('icon', 'hidden')\n    this.closeIcon = closeIcon\n\n    buttonContainer.appendChild(this.chatIcon)\n    buttonContainer.appendChild(this.closeIcon)\n    buttonContainer.addEventListener('click', this.toggleOpen.bind(this))\n\n    this.messageContainer = document.createElement('div')\n    this.messageContainer.classList.add('hidden', 'message-container')\n\n    this.createMessageContainerContent()\n\n    container.appendChild(this.messageContainer)\n    container.appendChild(buttonContainer)\n  }\n\n  createMessageContainerContent() {\n    this.messageContainer.innerHTML = ''\n    const title = document.createElement('h2')\n    title.textContent = `We're not here, drop us an email...`\n\n    const form = document.createElement('form')\n    form.classList.add('content')\n    const email = document.createElement('input')\n    email.required = true\n    email.id = 'email'\n    email.type = 'email'\n    email.placeholder = 'Enter your email address'\n\n    const message = document.createElement('textarea')\n    message.required = true\n    message.id = 'message'\n    message.placeholder = 'Your message'\n\n    const btn = document.createElement('button')\n    btn.textContent = 'Submit'\n    form.appendChild(email)\n    form.appendChild(message)\n    form.appendChild(btn)\n    form.addEventListener('submit', this.submit.bind(this))\n\n    this.messageContainer.appendChild(title)\n    this.messageContainer.appendChild(form)\n  }\n\n  createStyles() {\n    const styleTag = document.createElement('style')\n    styleTag.innerHTML = `\n            .icon {\n                cursor: pointer;\n                width: 70%;\n                position: absolute;\n                top: 9px;\n                left: 9px;\n                transition: transform .3s ease;\n            }\n            .hidden {\n                transform: scale(0);\n            }\n            .button-container {\n                background-color: #04b73f;\n                width: 60px;\n                height: 60px;\n                border-radius: 50%;\n            }\n            .message-container {\n                box-shadow: 0 0 18px 8px rgba(0, 0, 0, 0.1), 0 0 32px 32px rgba(0, 0, 0, 0.08);\n                width: 400px;\n                right: -25px;\n                bottom: 75px;\n                max-height: 400px;\n                position: absolute;\n                transition: max-height .2s ease;\n                font-family: Helvetica, Arial ,sans-serif;\n            }\n            .message-container.hidden {\n                max-height: 0px;\n            }\n            .message-container h2 {\n                margin: 0;\n                padding: 20px 20px;\n                color: #fff;\n                background-color: #04b73f;\n            }\n            .message-container .content {\n                margin: 20px 10px ;\n                border: 1px solid #dbdbdb;\n                padding: 10px;\n                display: flex;\n                background-color: #fff;\n                flex-direction: column;\n            }\n            .message-container form * {\n                margin: 5px 0;\n            }\n            .message-container form input {\n                padding: 10px;\n            }\n            .message-container form textarea {\n                height: 100px;\n                padding: 10px;\n            }\n            .message-container form textarea::placeholder {\n                font-family: Helvetica, Arial ,sans-serif;\n            }\n            .message-container form button {\n                cursor: pointer;\n                background-color: #04b73f;\n                color: #fff;\n                border: 0;\n                border-radius: 4px;\n                padding: 10px;\n            }\n            .message-container form button:hover {\n                background-color: #16632f;\n            }\n        `.replace(/^\\s+|\\n/gm, '')\n    document.head.appendChild(styleTag)\n  }\n\n  toggleOpen() {\n    this.open = !this.open\n    if (this.open) {\n      this.chatIcon.classList.add('hidden')\n      this.closeIcon.classList.remove('hidden')\n      this.messageContainer.classList.remove('hidden')\n    } else {\n      this.createMessageContainerContent()\n      this.chatIcon.classList.remove('hidden')\n      this.closeIcon.classList.add('hidden')\n      this.messageContainer.classList.add('hidden')\n    }\n  }\n\n  submit(event) {\n    event.preventDefault()\n    const formSubmission = {\n      email: event.srcElement.querySelector('#email').value,\n      message: event.srcElement.querySelector('#message').value,\n    }\n\n    this.messageContainer.innerHTML =\n      '<h2>Thanks for your submission.</h2><p class=\"content\">Someone will be in touch with your shortly regarding your enquiry'\n\n    console.log(formSubmission)\n  }\n}\n\nconst tawk = new Tawk({\n  position: 'bottom-right',\n})\n\n\n//# sourceURL=webpack://my-app/./src/test.js?");

    /***/ })
    
    /******/ 	});
    /************************************************************************/
    /******/ 	// The require scope
    /******/ 	var __webpack_require__ = {};
    /******/ 	
    /************************************************************************/
    /******/ 	/* webpack/runtime/define property getters */
    /******/ 	!function() {
    /******/ 		// define getter functions for harmony exports
    /******/ 		__webpack_require__.d = function(exports, definition) {
    /******/ 			for(var key in definition) {
    /******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
    /******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    /******/ 				}
    /******/ 			}
    /******/ 		};
    /******/ 	}();
    /******/ 	
    /******/ 	/* webpack/runtime/hasOwnProperty shorthand */
    /******/ 	!function() {
    /******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
    /******/ 	}();
    /******/ 	
    /******/ 	/* webpack/runtime/make namespace object */
    /******/ 	!function() {
    /******/ 		// define __esModule on exports
    /******/ 		__webpack_require__.r = function(exports) {
    /******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    /******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    /******/ 			}
    /******/ 			Object.defineProperty(exports, '__esModule', { value: true });
    /******/ 		};
    /******/ 	}();
    /******/ 	
    /************************************************************************/
    /******/ 	
    /******/ 	// startup
    /******/ 	// Load entry module and return exports
    /******/ 	// This entry module can't be inlined because the eval devtool is used.
    /******/ 	var __webpack_exports__ = {};
    /******/ 	__webpack_modules__["./src/test.js"](0, __webpack_exports__, __webpack_require__);
    /******/ 	
    /******/ })()
    ;