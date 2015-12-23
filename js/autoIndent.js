(function(undefined) {
    'use strict';
    var doc = document;
    var autoIndent = function(option) {
        var defaults = {
                textarea: null,
                replaceTab: true,
                softTabs: true,
                tabSize: 4,
                autoOpen: true,
                overwrite: true,
                autoStrip: true
            },
            tab,
            newLine,
            charSettings = {

                keyMap: [{
                    open: "\"",
                    close: "\"",
                    canBreak: false
                }, {
                    open: "'",
                    close: "'",
                    canBreak: false
                }, {
                    open: "(",
                    close: ")",
                    canBreak: false
                }, {
                    open: "[",
                    close: "]",
                    canBreak: true
                }, {
                    open: "{",
                    close: "}",
                    canBreak: true
                }]

            },
            utils = {
                defineNewLine: function() {
                    var ta = doc.createElement('textarea');
                    ta.value = '\n';

                    if (ta.value.length === 2) {
                        newLine = '\r\n';
                    } else {
                        newLine = '\n';
                    }
                },
                defineTabSize: function(tabSize) {
                    defaults.textarea.style.tabSize = tabSize;
                    return;
                },
                cursor: {
                    getLine: function(textVal, pos) {
                        return ((textVal.substring(0, pos)).split('\n')).length;
                    },
                    get: function() {
                        return defaults.textarea.selectionStart;
                    },
                    set: function(start, end) {
                        if (!end) {
                            end = start;
                        }

                        defaults.textarea.focus();
                        defaults.textarea.setSelectionRange(start, end);
                    },
                    selection: function() {
                        var textAreaElement = defaults.textarea,
                            start = textAreaElement.selectionStart,
                            end = textAreaElement.selectionEnd;

                        return start == end ? false : {
                            start: start,
                            end: end
                        };
                    }
                },
                editor: {
                    getLines: function(textVal) {
                        return (textVal).split('\n').length;
                    },
                    get: function() {
                        return defaults.textarea.value.replace(/\r/g, '');
                    },
                    set: function(data) {
                        defaults.textarea.value = data;
                    }
                },
                isEven: function(i) {
                    return i % 2;
                },
                levelsDeep: function() {
                    var pos = utils.cursor.get(),
                        val = utils.editor.get();

                    var left = val.substring(0, pos),
                        levels = 0,
                        i, j;

                    for (i = 0; i < left.length; i++) {
                        for (j = 0; j < charSettings.keyMap.length; j++) {
                            if (charSettings.keyMap[j].canBreak) {
                                if (charSettings.keyMap[j].open == left.charAt(i)) {
                                    levels++;
                                }

                                if (charSettings.keyMap[j].close == left.charAt(i)) {
                                    levels--;
                                }
                            }
                        }
                    }

                    var toDecrement = 0,
                        quoteMap = ["'", "\""];
                    for (i = 0; i < charSettings.keyMap.length; i++) {
                        if (charSettings.keyMap[i].canBreak) {
                            for (j in quoteMap) {
                                toDecrement += left.split(quoteMap[j]).filter(utils.isEven).join('').split(charSettings.keyMap[i].open).length - 1;
                            }
                        }
                    }

                    var finalLevels = levels - toDecrement;

                    return finalLevels >= 0 ? finalLevels : 0;
                },
                deepExtend: function(destination, source) {
                    for (var property in source) {
                        if (source[property] && source[property].constructor &&
                            source[property].constructor === Object) {
                            destination[property] = destination[property] || {};
                            utils.deepExtend(destination[property], source[property]);
                        } else {
                            destination[property] = source[property];
                        }
                    }
                    return destination;
                },
                addEvent: function addEvent(element, eventName, func) {
                    element.addEventListener(eventName, func, false);
                },
                removeEvent: function addEvent(element, eventName, func) {
                    element.removeEventListener(eventName, func, false);
                }
            },
            intercept = {
                tabKey: function(e) {
                    if (e.keyCode == 9) {
                        e.preventDefault();

                        var toReturn = true;

                        var selection = utils.cursor.selection(),
                            pos = utils.cursor.get(),
                            val = utils.editor.get();

                        if (selection) {

                            var tempStart = selection.start;
                            while (tempStart--) {
                                if (val.charAt(tempStart) == "\n") {
                                    selection.start = tempStart + 1;
                                    break;
                                }
                            }

                            var toIndent = val.substring(selection.start, selection.end),
                                lines = toIndent.split("\n"),
                                i;

                            if (e.shiftKey) {
                                for (i = 0; i < lines.length; i++) {
                                    if (lines[i].substring(0, tab.length) == tab) {
                                        lines[i] = lines[i].substring(tab.length);
                                    }
                                }
                                toIndent = lines.join("\n");

                                utils.editor.set(val.substring(0, selection.start) + toIndent + val.substring(selection.end));
                                utils.cursor.set(selection.start, selection.start + toIndent.length);

                            } else {
                                for (i in lines) {
                                    lines[i] = tab + lines[i];
                                }
                                toIndent = lines.join("\n");

                                utils.editor.set(val.substring(0, selection.start) + toIndent + val.substring(selection.end));
                                utils.cursor.set(selection.start, selection.start + toIndent.length);
                            }
                        } else {
                            var left = val.substring(0, pos),
                                right = val.substring(pos),
                                edited = left + tab + right;

                            if (e.shiftKey) {
                                if (val.substring(pos - tab.length, pos) == tab) {
                                    edited = val.substring(0, pos - tab.length) + right;
                                    utils.editor.set(edited);
                                    utils.cursor.set(pos - tab.length);
                                }
                            } else {
                                utils.editor.set(edited);
                                utils.cursor.set(pos + tab.length);
                                toReturn = false;
                            }
                        }
                    }
                    return toReturn;
                },
                enterKey: function(e) {

                    if (e.keyCode == 13) {

                        e.preventDefault();

                        var pos = utils.cursor.get(),
                            val = utils.editor.get(),
                            left = val.substring(0, pos),
                            right = val.substring(pos),
                            leftChar = left.charAt(left.length - 1),
                            rightChar = right.charAt(0),
                            numTabs = utils.levelsDeep(),
                            ourIndent = '',
                            closingBreak = '',
                            finalCursorPos,
                            i;
                        if (!numTabs) {
                            finalCursorPos = 1;
                        } else {
                            while (numTabs--) {
                                ourIndent += tab;
                            }
                            ourIndent = ourIndent;
                            finalCursorPos = ourIndent.length + 1;

                            for (i = 0; i < charSettings.keyMap.length; i++) {
                                if (charSettings.keyMap[i].open == leftChar && charSettings.keyMap[i].close == rightChar) {
                                    closingBreak = newLine;
                                }
                            }

                        }

                        var edited = left + newLine + ourIndent + closingBreak + (ourIndent.substring(0, ourIndent.length - tab.length)) + right;
                        utils.editor.set(edited);
                        utils.cursor.set(pos + finalCursorPos);
                    }
                },
                deleteKey: function(e) {

                    if (e.keyCode == 8) {
                        e.preventDefault();


                        var pos = utils.cursor.get(),
                            val = utils.editor.get(),
                            left = val.substring(0, pos),
                            right = val.substring(pos),
                            leftChar = left.charAt(left.length - 1),
                            rightChar = right.charAt(0),
                            i;

                        if (utils.cursor.selection() === false) {
                            for (i = 0; i < charSettings.keyMap.length; i++) {
                                if (charSettings.keyMap[i].open == leftChar && charSettings.keyMap[i].close == rightChar) {
                                    var edited = val.substring(0, pos - 1) + val.substring(pos + 1);
                                    utils.editor.set(edited);
                                    utils.cursor.set(pos - 1);
                                    return;
                                }
                            }
                            var edited = val.substring(0, pos - 1) + val.substring(pos);
                            utils.editor.set(edited);
                            utils.cursor.set(pos - 1);
                        } else {
                            var sel = utils.cursor.selection(),
                                edited = val.substring(0, sel.start) + val.substring(sel.end);
                            utils.editor.set(edited);
                            utils.cursor.set(pos);
                        }

                    }
                }
            },
            charFuncs = {
                openedChar: function(_char, e) {
                    e.preventDefault();
                    var pos = utils.cursor.get(),
                        val = utils.editor.get(),
                        left = val.substring(0, pos),
                        right = val.substring(pos),
                        edited = left + _char.open + _char.close + right;

                    defaults.textarea.value = edited;
                    utils.cursor.set(pos + 1);
                },
                closedChar: function(_char, e) {
                    var pos = utils.cursor.get(),
                        val = utils.editor.get(),
                        toOverwrite = val.substring(pos, pos + 1);
                    if (toOverwrite == _char.close) {
                        e.preventDefault();
                        utils.cursor.set(utils.cursor.get() + 1);
                        return true;
                    }
                    return false;
                }
            },
            action = {
                filter: function(e) {

                    var theCode = e.which || e.keyCode;

                    if (theCode == 39 || theCode == 40 && e.which === 0) {
                        return;
                    }

                    var _char = String.fromCharCode(theCode),
                        i;

                    for (i = 0; i < charSettings.keyMap.length; i++) {

                        if (charSettings.keyMap[i].close == _char) {
                            var didClose = defaults.overwrite && charFuncs.closedChar(charSettings.keyMap[i], e);

                            if (!didClose && charSettings.keyMap[i].open == _char && defaults.autoOpen) {
                                charFuncs.openedChar(charSettings.keyMap[i], e);
                            }
                        } else if (charSettings.keyMap[i].open == _char && defaults.autoOpen) {
                            charFuncs.openedChar(charSettings.keyMap[i], e);
                        }
                    }
                },
                listen: function() {
                    if (defaults.replaceTab) {
                        utils.addEvent(defaults.textarea, 'keydown', intercept.tabKey);
                    }
                    utils.addEvent(defaults.textarea, 'keydown', intercept.enterKey);
                    if (defaults.autoStrip) {
                        utils.addEvent(defaults.textarea, 'keydown', intercept.deleteKey);
                    }

                    utils.addEvent(defaults.textarea, 'keypress', action.filter);

                }
            },
            init = function(opts) {

                if (opts.textarea) {
                    utils.deepExtend(defaults, opts);
                    utils.defineNewLine();

                    if (defaults.softTabs) {
                        tab = ' '.repeat(defaults.tabSize);
                    } else {
                        tab = '\t';
                        utils.defineTabSize(defaults.tabSize);
                    }
                    if (opts.json) {
                        defaults.textarea.value = JSON.stringify(opts.json, null, tab);
                    }
                    action.listen();
                }

            };

        this.destroy = function() {
            utils.removeEvent(defaults.textarea, 'keydown', intercept.tabKey);
            utils.removeEvent(defaults.textarea, 'keydown', intercept.enterKey);
            utils.removeEvent(defaults.textarea, 'keydown', intercept.deleteKey);
            utils.removeEvent(defaults.textarea, 'keypress', action.filter);
        };

        this.get = function () {
            var text = defaults.textarea.value;
            try{
                return JSON.parse(text);
            }catch(err){
                return text.trim();
            }
        };

        init(option);

    };
    this.autoIndent = autoIndent;
}).call(this);
