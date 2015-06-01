(function(doc) {
    'use strict';

    var sampleApp = window.sampleApp || {};

    // Utils
    sampleApp.utils = (function() {
        var utils = {};

        utils.select = {};
        utils.templates = {};
        utils.xhr = {};

        function _getTemplateValue(path, data) {
            var value = ''
                , tmpArr
                , i;

            if (path.indexOf('.') === -1) {
                value = data[path];
            } else {
                tmpArr = path.split('.');
                for (i = 0; i < tmpArr.length; i++) {
                    value = data[tmpArr[i]];
                }
            }

            return value;
        }

        /**
         * find closest element up the DOM with klass
         * @param {Element} elem
         * @param {String} klass
         * return {Element | null} needle
         */
        utils.select.closest = function(elem, klass) {
            var needle = null;
            (function find(elem, klass) {
                var parent = elem.parentElement;
                if (parent.nodeName.toLowerCase() !== 'body') {
                    if (parent.classList.contains(klass)) {
                        needle = parent;
                        return parent;
                    }
                    find(parent, klass);
                }
            }(elem, klass));

            return needle;
        };

        /**
         * return template populated with data
         * @param {Element} template
         * @param {Object} data
         * @return {Element} template
         */
        utils.templates.templatize = function(template, data) {
            var data = data;

            (function wrap(children) {
                children.forEach(function(childElem) {
                    var value, valuePath;
                    if (childElem.childElementCount) {
                        wrap(Array.prototype.slice.call(childElem.children, this));
                    } else {
                        valuePath = childElem.getAttribute('data-template');
                        if (!valuePath) { return; }
                        value = _getTemplateValue(valuePath, data); //TODO: remove data?
                        childElem.innerHTML = value;
                    }
                });

                return template;
            }(Array.prototype.slice.call(template.children, this)));
        };

        /**
         * thanks YK https://github.com/tildeio/rsvp.js
         * @param {String} url
         * @return {RSVP Promise} promise
         */
        utils.xhr.getJSON = function(url) {
            var promise = new RSVP.Promise(function(resolve, reject){
            var client = new XMLHttpRequest();
                client.open("GET", url);
                client.onreadystatechange = handler;
                client.responseType = "json";
                client.setRequestHeader("Accept", "application/json");
                client.send();

                function handler() {
                    if (this.readyState === this.DONE) {
                        if (this.status === 200) { resolve(this.response); }
                        else { reject(this); }
                    }
                }
            });
            return promise;
        };

        return utils;
    }());

    // Base App
    sampleApp.App = {
        utils : sampleApp.utils,
        init: function(url) {
            var that = this;

            // Shortcut long path names
            this.getJSON = this.utils.xhr.getJSON;
            this.tmpl = this.utils.templates;
            this.select = this.utils.select;

            // Kickoff
            doc.addEventListener('DOMContentLoaded', function() {
                that.getJSON(url).then(function(data) {
                    that.populatePage(data);
                }, function(error) {
                    console.error(error); // handle errors
                });
            });
        },
        // Override
        populatePage: function() {},
        // Override
        setupEvents: function() {}
    };

    // Our app of posts by users with comments and user info
    var postsApp = Object.create(sampleApp.App, {
        loaderElem: {value: doc.querySelector('.loader')},
        mainElem: {value: doc.querySelector('.main')},
        userOverlayElem: {value: doc.querySelector('.user-overlay')}
    });

    //---------------------------------------------------------------------------------------------
    // Put data on the page

    /**
     * populate post comments
     * @param {Element} elem
     * @param {Array.<String, Array.<Object>
     */
    postsApp.populateComments = function(elem, data) {
        var template = document.querySelector('.comments')
            , postElem = elem.parentElement // TODO: use utils
            , commentsWrapperElem = template.cloneNode(true)
            , commentLi = commentsWrapperElem.querySelector('li');

        data.forEach(function(comment) {
            var li = commentLi.cloneNode(true);
            this.tmpl.templatize(li, comment);
            commentsWrapperElem.appendChild(li);
        }, this);
        commentLi.parentElement.removeChild(commentLi);
        postElem.appendChild(commentsWrapperElem);
        commentsWrapperElem.classList.add('show');
    };

    /**
     * populate main.main
     * @Override
     * @param {Array.<String, Array.<Object> | Object} data
     */
    postsApp.populatePage = function(data) {
        var template = document.querySelector('.entry')
            , frag = document.createDocumentFragment()
            , parsedData = JSON.parse(data)
            , users = parsedData.users
            , posts = parsedData.posts;

        this.data = parsedData;

        posts.forEach(function(post) {
            var entryElem = template.cloneNode(true)
                , postElem = entryElem.querySelector('.post')
                , userElem = entryElem.querySelector('.user');

            postElem.setAttribute('data-post-id', post.id);
            userElem.setAttribute('data-user-id', users[post.userId].id);
            this.tmpl.templatize(postElem, post);
            this.tmpl.templatize(userElem, users[post.userId]);

            frag.appendChild(entryElem);
        }, this);

        template.parentElement.appendChild(frag);
        template.parentElement.removeChild(template);
        this.loaderElem.classList.add('hide');
        this.mainElem.classList.remove('hide');
        this.setupEvents();
    };

    //---------------------------------------------------------------------------------------------
    // Events

    /**
     * add event listeners
     * @Override
     */
    postsApp.setupEvents = function() {
        this.mainElem.addEventListener('click', this.mainDelegate.bind(this));
        this.userOverlayElem.addEventListener('click', this.userOverlayDelegate.bind(this));
    };

    /**
     * populate/show post comments
     * @param {Element} elem
     * @param {String} id
     */
    postsApp.commentsDelegate = function(elem, id) {
        var that = this
            , existingCommentsElem = elem.parentElement.querySelector('.comments');
        if (existingCommentsElem) {
            existingCommentsElem.classList.toggle('show');
            return;
        }
        this.getJSON('/comments/' + id).then(function(data) {
            that.populateComments(elem, JSON.parse(data));
        }, function(error) {
            console.error(error);
        });
    };

    /**
     * listen to main.main and delegate
     * @param {Event} evt
     */
    postsApp.mainDelegate = function(evt) {
        var target = evt.target
            , commentsElem
            , link
            , userElem;

        evt.preventDefault();

        if (!evt.target.href) { return; }

        link = evt.target.href.split('#')[1];

        switch(link) {
            case 'user':
                userElem = this.select.closest(target, 'user');
                userElem && this.userDelegate(userElem.getAttribute('data-user-id'));
            break;

            case 'comments':
                commentsElem = this.select.closest(target, 'post');
                commentsElem && this.commentsDelegate(target, commentsElem.getAttribute('data-post-id'));
            break;

            default:
            break;
        }
    };

    /**
     * show user info overlay
     * @param {Element} elem
     * @param {String} id
     */
    postsApp.userDelegate = function(id) {
        var overlay = document.querySelector('.user-overlay')
            , user = this.data.users[id];

        this.tmpl.templatize(overlay, user);
        overlay.classList.add('show');
    };

    /**
     * close user info overlay
     * @param {Event} evt
     */
    postsApp.userOverlayDelegate = function(evt) {
        var currentTarget = evt.currentTarget;

        if (currentTarget.classList.contains('show')) {
            currentTarget.classList.remove('show');
        }
    };

    postsApp.init('/entries');
}(document));

