/*!
    zarashort.js
    Copyright Zaraciccio De Zaracicci, 2020
    Please read the LICENSE file (you can obtain one here: zaracicciocss.zarahost.rf.gd/license) and the README.md file.
    Thanks!
*/

(function(window, document, undefined) {
    var _MAP = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            45: 'ins',
            46: 'del',
            91: 'meta',
            93: 'meta',
            224: 'meta'
        },
        _KEYCODE_MAP = {
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111 : '/',
            186: ';',
            187: '=',
            188: ',',
            189: '-',
            190: '.',
            191: '/',
            192: '`',
            219: '[',
            220: '\\',
            221: ']',
            222: '\''
        },
        _SHIFT_MAP = {
            '~': '`',
            '!': '1',
            '@': '2',
            '#': '3',
            '$': '4',
            '%': '5',
            '^': '6',
            '&': '7',
            '*': '8',
            '(': '9',
            ')': '0',
            '_': '-',
            '+': '=',
            ':': ';',
            '\"': '\'',
            '<': ',',
            '>': '.',
            '?': '/',
            '|': '\\'
        },
        _SPECIAL_ALIASES = {
            'option': 'alt',
            'command': 'meta',
            'return': 'enter',
            'escape': 'esc',
            'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
        },
        _REVERSE_MAP,
        _callbacks = {},
        _directMap = {},
        _sequenceLevels = {},
        _resetTimer,
        _ignoreNextKeyup = false,
        _ignoreNextKeypress = false,
        _nextExpectedAction = false;

    for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = 'f' + i;
    }

    for (i = 0; i <= 9; ++i) {
        _MAP[i + 96] = i;
    }

    function _addEvent(object, type, callback) {
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
            return;
        }
        object.attachEvent('on' + type, callback);
    }

    function _characterFromEvent(e) {
        if (e.type == 'keypress') {
            var character = String.fromCharCode(e.which);
            if (!e.shiftKey) {
                character = character.toLowerCase();
            }
            return character;
        }
        if (_MAP[e.which]) {
            return _MAP[e.which];
        }
        if (_KEYCODE_MAP[e.which]) {
            return _KEYCODE_MAP[e.which];
        }
        return String.fromCharCode(e.which).toLowerCase();
    }

    function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(',') === modifiers2.sort().join(',');
    }
    
    function _resetSequences(doNotReset) {
        doNotReset = doNotReset || {};
        var activeSequences = false,
            key;
        for (key in _sequenceLevels) {
            if (doNotReset[key]) {
                activeSequences = true;
                continue;
            }
            _sequenceLevels[key] = 0;
        }

        if (!activeSequences) {
            _nextExpectedAction = false;
        }
    }

    function _getMatches(character, modifiers, e, sequenceName, combination, level) {
        var i,
            callback,
            matches = [],
            action = e.type;
        if (!_callbacks[character]) {
            return [];
        }
        if (action == 'keyup' && _isModifier(character)) {
            modifiers = [character];
        }
        for (i = 0; i < _callbacks[character].length; ++i) {
            callback = _callbacks[character][i];
            if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
                continue;
            }
            if (action != callback.action) {
                continue;
            }
            if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {
                var deleteCombo = !sequenceName && callback.combo == combination;
                var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
                if (deleteCombo || deleteSequence) {
                    _callbacks[character].splice(i, 1);
                }
                matches.push(callback);
            }
        }
        return matches;
    }

    function _eventModifiers(e) {
        var modifiers = [];
        if (e.shiftKey) {
            modifiers.push('shift');
        }
        if (e.altKey) {
            modifiers.push('alt');
        }
        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }
        if (e.metaKey) {
            modifiers.push('meta');
        }
        return modifiers;
    }

    function _preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
            return;
        }
        e.returnValue = false;
    }

    function _stopPropagation(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
            return;
        }
        e.cancelBubble = true;
    }

    function _fireCallback(callback, e, combo, sequence) {
        if (zarashort.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
            return;
        }
        if (callback(e, combo) === false) {
            _preventDefault(e);
            _stopPropagation(e);
        }
    }

    function _handleKey(character, modifiers, e) {
        var callbacks = _getMatches(character, modifiers, e),
            i,
            doNotReset = {},
            maxLevel = 0,
            processedSequenceCallback = false;
        for (i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].seq) {
                maxLevel = Math.max(maxLevel, callbacks[i].level);
            }
        }
        for (i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].seq) {
                if (callbacks[i].level != maxLevel) {
                    continue;
                }
                processedSequenceCallback = true;
                doNotReset[callbacks[i].seq] = 1;
                _fireCallback(callbacks[i].callback, e, callbacks[i].combo, callbacks[i].seq);
                continue;
            }
            if (!processedSequenceCallback) {
                _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
            }
        }
        var ignoreThisKeypress = e.type == 'keypress' && _ignoreNextKeypress;
        if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
            _resetSequences(doNotReset);
        }
        _ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';
    }

    function _handleKeyEvent(e) {
        if (typeof e.which !== 'number') {
            e.which = e.keyCode;
        }
        var character = _characterFromEvent(e);
        if (!character) {
            return;
        }
        if (e.type == 'keyup' && _ignoreNextKeyup === character) {
            _ignoreNextKeyup = false;
            return;
        }
        zarashort.handleKey(character, _eventModifiers(e), e);
    }
    function _isModifier(key) {
        return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
    }
    function _resetSequenceTimer() {
        clearTimeout(_resetTimer);
        _resetTimer = setTimeout(_resetSequences, 1000);
    }
    function _getReverseMap() {
        if (!_REVERSE_MAP) {
            _REVERSE_MAP = {};
            for (var key in _MAP) {
                if (key > 95 && key < 112) {
                    continue;
                }
                if (_MAP.hasOwnProperty(key)) {
                    _REVERSE_MAP[_MAP[key]] = key;
                }
            }
        }
        return _REVERSE_MAP;
    }
    function _pickBestAction(key, modifiers, action) {
        if (!action) {
            action = _getReverseMap()[key] ? 'keydown' : 'keypress';
        }
        if (action == 'keypress' && modifiers.length) {
            action = 'keydown';
        }
        return action;
    }
    function _bindSequence(combo, keys, callback, action) {
        _sequenceLevels[combo] = 0;
        function _increaseSequence(nextAction) {
            return function() {
                _nextExpectedAction = nextAction;
                ++_sequenceLevels[combo];
                _resetSequenceTimer();
            };
        }
        function _callbackAndReset(e) {
            _fireCallback(callback, e, combo);
            if (action !== 'keyup') {
                _ignoreNextKeyup = _characterFromEvent(e);
            }
            setTimeout(_resetSequences, 10);
        }
        for (var i = 0; i < keys.length; ++i) {
            var isFinal = i + 1 === keys.length;
            var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i + 1]).action);
            _bindSingle(keys[i], wrappedCallback, action, combo, i);
        }
    }
    function _keysFromString(combination) {
        if (combination === '+') {
            return ['+'];
        }
        return combination.split('+');
    }
    function _getKeyInfo(combination, action) {
        var keys,
            key,
            i,
            modifiers = [];
        keys = _keysFromString(combination);

        for (i = 0; i < keys.length; ++i) {
            key = keys[i];
            if (_SPECIAL_ALIASES[key]) {
                key = _SPECIAL_ALIASES[key];
            }
            if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                key = _SHIFT_MAP[key];
                modifiers.push('shift');
            }
            if (_isModifier(key)) {
                modifiers.push(key);
            }
        }
        action = _pickBestAction(key, modifiers, action);
        return {
            key: key,
            modifiers: modifiers,
            action: action
        };
    }
    function _bindSingle(combination, callback, action, sequenceName, level) {
        _directMap[combination + ':' + action] = callback;
        combination = combination.replace(/\s+/g, ' ');
        var sequence = combination.split(' '),
            info;
        if (sequence.length > 1) {
            _bindSequence(combination, sequence, callback, action);
            return;
        }
        info = _getKeyInfo(combination, action);
        _callbacks[info.key] = _callbacks[info.key] || [];
        _getMatches(info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);
        _callbacks[info.key][sequenceName ? 'unshift' : 'push']({
            callback: callback,
            modifiers: info.modifiers,
            action: info.action,
            seq: sequenceName,
            level: level,
            combo: combination
        });
    }
    function _bindMultiple(combinations, callback, action) {
        for (var i = 0; i < combinations.length; ++i) {
            _bindSingle(combinations[i], callback, action);
        }
    }
    _addEvent(document, 'keypress', _handleKeyEvent);
    _addEvent(document, 'keydown', _handleKeyEvent);
    _addEvent(document, 'keyup', _handleKeyEvent);
    var zarashort = {
        bind: function(keys, callback, action) {
            keys = keys instanceof Array ? keys : [keys];
            _bindMultiple(keys, callback, action);
            return this;
        },
        unbind: function(keys, action) {
            return zarashort.bind(keys, function() {}, action);
        },
        trigger: function(keys, action) {
            if (_directMap[keys + ':' + action]) {
                _directMap[keys + ':' + action]({}, keys);
            }
            return this;
        },
        reset: function() {
            _callbacks = {};
            _directMap = {};
            return this;
        },
        stopCallback: function(e, element) {
            if ((' ' + element.className + ' ').indexOf(' zarashort ') > -1) {
                return false;
            }
            return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || element.isContentEditable;
        },
        handleKey: _handleKey
    };
    window.zarashort = zarashort;
    if (typeof define === 'function' && define.amd) {
        define(zarashort);
    }
}) (window, document);