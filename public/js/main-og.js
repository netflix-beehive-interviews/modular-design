

// OLD ----------------------
(function(doc, win) {
    'use strict';

    /**
     * kickoff
     */
    function init() {
        this.mainElem = doc.querySelector('.main');
        this.userOverlayElem = doc.querySelector('.user-overlay');
        this.loaderElem = doc.querySelector('.loader');
        this.tmpl = templateUtils();
        this.utils = selectionUtils();

        var jqxhr = $.get('/entries')
                .done(function(data) {
                    populatePage(JSON.parse(data));
                });
    };

    //---------------------------------------------------------------------------------------------
    // Utils

    // /**
    //  * DOM selection utils
    //  * @return Object utils
    //  */
    // function selectionUtils() {
    //     var utils = {};

    //     /**
    //      * find closest element up the DOM with klass
    //      * @param {Element} elem
    //      * @param {String} klass
    //      * return {Element | null} needle
    //      */
    //     utils.closest = function(elem, klass) {
    //         var needle = null;
    //         (function find(elem, klass) {
    //             var parent = elem.parentElement;
    //             if (parent.nodeName.toLowerCase() !== 'body') {
    //                 if (parent.classList.contains(klass)) {
    //                     needle = parent
    //                     return parent;
    //                 } else {
    //                     find(parent, klass);
    //                 }
    //             }
    //         }(elem, klass));

    //         return needle;
    //     }

    //     return utils;
    // }

    // /**
    //  * template utils
    //  * @return Object utils
    //  */
    // function templateUtils() {
    //     var utils = {};

    //     /**
    //      * find value in data
    //      * @param {String} path
    //      * @param {Object} data
    //      * @return {String} value
    //     */
    //     function _getTemplateValue(path, data) {
    //         var value = ''
    //             , tmpArr;

    //         if (path.indexOf('.') === -1) {
    //             value = data[path];
    //         } else {
    //             tmpArr = path.split('.');
    //             for (var i=0; i < tmpArr.length; i++) {
    //                 value = data[tmpArr[i]];
    //             }
    //         }

    //         return value;
    //     }

    //     /**
    //      * return template populated with data
    //      * @param {Element} template
    //      * @param {Object} data
    //      * @return {Element} template
    //      */
    //     utils.templatize = function(template, data) {
    //         var children = Array.prototype.slice.call(template.children, this)
    //             , data = data;

    //         (function wrap(kids) {
    //             kids.forEach(function(childElem) {
    //                 var value;
    //                 if (childElem.childElementCount) {
    //                     wrap(Array.prototype.slice.call(childElem.children, this));
    //                 } else {
    //                     valuePath = childElem.getAttribute('data-template');
    //                     if (!valuePath) { return; }
    //                     value = _getTemplateValue(valuePath, data); //TODO: remove data?
    //                     childElem.innerHTML = value;
    //                 }
    //             });

    //             return template;
    //         }(children));
    //     }

    //     return utils;
    // }
    
    //---------------------------------------------------------------------------------------------
    // Put data on the page

    /**
     * populate post comments
     * @param {Element} elem
     * @param {Array.<String, Array.<Object>
     */
    function populateComments(elem, data) {
        var template = doc.querySelector('.comments')
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
    }

    /**
     * populate main.main
     * @param {Array.<String, Array.<Object> | Object} data
     */
    function populatePage(data) {
        var template = doc.querySelector('.entry')
            , frag = doc.createDocumentFragment()
            , users = data.users
            , posts = data.posts;

        this.data = data;

        console.log('%cDATA %o', 'color:aquamarine', data);

        posts.forEach(function(post) {
            var entryElem = template.cloneNode(true)
                , postElem = entryElem.querySelector('.post')
                , userElem = entryElem.querySelector('.user');

            postElem.setAttribute('data-post-id', post.id);
            userElem.setAttribute('data-user-id', users[post.userId].id);
            this.tmpl.templatize(postElem, post);
            this.tmpl.templatize(userElem, data.users[post.userId]);

            frag.appendChild(entryElem);
        }, this);

        template.parentElement.appendChild(frag);
        template.parentElement.removeChild(template);
        this.loaderElem.classList.add('hide');
        this.mainElem.classList.remove('hide');
        setupEvents();
    }

    //---------------------------------------------------------------------------------------------
    // Events

    /**
     * add event listeners
     */
    function setupEvents() {
        this.mainElem.addEventListener('click', mainDelegate.bind(this));
        this.userOverlayElem.addEventListener('click', userOverlayDelegate.bind(this));
    };

    /**
     * listen to main.main and delegate
     * @param {Event} evt
     */
    function mainDelegate(evt) {
        var target = evt.target
            , commentsElem
            , link
            , userElem;

        evt.preventDefault();

        if (!evt.target.href) { return; }

        link = evt.target.href.split('#')[1]

        switch(link) {
            case 'user':
                userElem = this.utils.closest(target, 'user');
                userElem && userDelegate(target, userElem.getAttribute('data-user-id'));
            break;

            case 'comments':
                commentsElem = this.utils.closest(target, 'post');
                commentsElem && commentsDelegate(target, commentsElem.getAttribute('data-post-id'));
            break;

            default:
                return;
            break;
        }
    };

    /**
     * populate/show post comments
     * @param {Element} elem
     * @param {String} id
     */
    function commentsDelegate(elem, id) {
        var existingCommentsElem = elem.parentElement.querySelector('.comments');
        if (existingCommentsElem) {
            existingCommentsElem.classList.toggle('show');
            return;
        }
        var jqxhr = $.get('/comments/' + id)
                .done(function(data) {
                    populateComments(elem, JSON.parse(data));
                });
    };

    /**
     * show user info overlay
     * @param {Element} elem
     * @param {String} id
     */
    function userDelegate(elem, id) {
        var overlay = doc.querySelector('.user-overlay')
            , user = this.data.users[id];

        this.tmpl.templatize(overlay, user);
        overlay.classList.add('show');
    };

    /**
     * close user info overlay
     * @param {Event} evt
     */
    function userOverlayDelegate(evt) {
        var currentTarget = evt.currentTarget;

        if (currentTarget.classList.contains('show')) {
            currentTarget.classList.remove('show');
        }
    };

    /**
     * DOM ready
     */
    doc.addEventListener('DOMContentLoaded', function(evt) {
        init();
    });

}(document, window));