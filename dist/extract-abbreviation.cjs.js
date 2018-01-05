'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/**
 * Minimalistic backwards stream reader
 */

var StreamReader = function () {
	function StreamReader(string) {
		classCallCheck(this, StreamReader);

		this.string = string;
		this.pos = this.string.length;
	}

	createClass(StreamReader, [{
		key: 'sol',
		value: function sol() {
			return this.pos === 0;
		}
	}, {
		key: 'peek',
		value: function peek(offset) {
			return this.string.charCodeAt(this.pos - 1 + (offset || 0));
		}
	}, {
		key: 'prev',
		value: function prev() {
			if (!this.sol()) {
				return this.string.charCodeAt(--this.pos);
			}
		}
	}, {
		key: 'eat',
		value: function eat(match) {
			var ok = typeof match === 'function' ? match(this.peek()) : match === this.peek();

			if (ok) {
				this.pos--;
			}

			return ok;
		}
	}, {
		key: 'eatWhile',
		value: function eatWhile(match) {
			var start = this.pos;
			while (this.eat(match)) {}
			return this.pos < start;
		}
	}]);
	return StreamReader;
}();

/**
 * Quotes-related utilities
 */

var SINGLE_QUOTE = 39; // '
var DOUBLE_QUOTE = 34; // "
var ESCAPE = 92; // \

/**
 * Check if given character code is a quote
 * @param  {Number}  c
 * @return {Boolean}
 */
function isQuote(c) {
	return c === SINGLE_QUOTE || c === DOUBLE_QUOTE;
}

/**
 * Consumes quoted value, if possible
 * @param  {StreamReader} stream
 * @return {Boolean}      Returns `true` is value was consumed
 */
function eatQuoted(stream) {
	var start = stream.pos;
	var quote = stream.prev();

	if (isQuote(quote)) {
		while (!stream.sol()) {
			if (stream.prev() === quote && stream.peek() !== ESCAPE) {
				return true;
			}
		}
	}

	stream.pos = start;
	return false;
}

var TAB = 9;
var SPACE = 32;
var DASH = 45; // -
var SLASH = 47; // /
var COLON = 58; // :
var EQUALS = 61; // =
var ANGLE_LEFT = 60; // <
var ANGLE_RIGHT = 62; // >

/**
 * Check if given reader’s current position points at the end of HTML tag
 * @param  {StreamReader} stream
 * @return {Boolean}
 */
var isAtHTMLTag = function (stream) {
	var start = stream.pos;

	if (!stream.eat(ANGLE_RIGHT)) {
		return false;
	}

	var ok = false;
	stream.eat(SLASH); // possibly self-closed element

	while (!stream.sol()) {
		stream.eatWhile(isWhiteSpace);

		if (eatIdent(stream)) {
			// ate identifier: could be a tag name, boolean attribute or unquoted
			// attribute value
			if (stream.eat(SLASH)) {
				// either closing tag or invalid tag
				ok = stream.eat(ANGLE_LEFT);
				break;
			} else if (stream.eat(ANGLE_LEFT)) {
				// opening tag
				ok = true;
				break;
			} else if (stream.eat(isWhiteSpace)) {
				// boolean attribute
				continue;
			} else if (stream.eat(EQUALS)) {
				// simple unquoted value or invalid attribute
				ok = eatIdent(stream);
				break;
			} else if (eatAttributeWithUnquotedValue(stream)) {
				// identifier was a part of unquoted value
				ok = true;
				break;
			}

			// invalid tag
			break;
		}

		if (eatAttribute(stream)) {
			continue;
		}

		break;
	}

	stream.pos = start;
	return ok;
};

/**
 * Eats HTML attribute from given string.
 * @param  {StreamReader} state
 * @return {Boolean}       `true` if attribute was consumed.
 */
function eatAttribute(stream) {
	return eatAttributeWithQuotedValue(stream) || eatAttributeWithUnquotedValue(stream);
}

/**
 * @param  {StreamReader} stream
 * @return {Boolean}
 */
function eatAttributeWithQuotedValue(stream) {
	var start = stream.pos;
	if (eatQuoted(stream) && stream.eat(EQUALS) && eatIdent(stream)) {
		return true;
	}

	stream.pos = start;
	return false;
}

/**
 * @param  {StreamReader} stream
 * @return {Boolean}
 */
function eatAttributeWithUnquotedValue(stream) {
	var start = stream.pos;
	if (stream.eatWhile(isUnquotedValue) && stream.eat(EQUALS) && eatIdent(stream)) {
		return true;
	}

	stream.pos = start;
	return false;
}

/**
 * Eats HTML identifier from stream
 * @param  {StreamReader} stream
 * @return {Boolean}
 */
function eatIdent(stream) {
	return stream.eatWhile(isIdent);
}

/**
 * Check if given character code belongs to HTML identifier
 * @param  {Number}  c
 * @return {Boolean}
 */
function isIdent(c) {
	return c === COLON || c === DASH || isAlpha(c) || isNumber(c);
}

/**
 * Check if given character code is alpha code (letter though A to Z)
 * @param  {Number}  c
 * @return {Boolean}
 */
function isAlpha(c) {
	c &= ~32; // quick hack to convert any char code to uppercase char code
	return c >= 65 && c <= 90; // A-Z
}

/**
 * Check if given code is a number
 * @param  {Number}  c
 * @return {Boolean}
 */
function isNumber(c) {
	return c > 47 && c < 58;
}

/**
 * Check if given code is a whitespace
 * @param  {Number}  c
 * @return {Boolean}
 */
function isWhiteSpace(c) {
	return c === SPACE || c === TAB;
}

/**
 * Check if given code may belong to unquoted attribute value
 * @param  {Number}  c
 * @return {Boolean}
 */
function isUnquotedValue(c) {
	return c && c !== EQUALS && !isWhiteSpace(c) && !isQuote(c);
}

var code = function code(ch) {
	return ch.charCodeAt(0);
};
var SQUARE_BRACE_L = code('[');
var SQUARE_BRACE_R = code(']');
var ROUND_BRACE_L = code('(');
var ROUND_BRACE_R = code(')');
var CURLY_BRACE_L = code('{');
var CURLY_BRACE_R = code('}');

var specialChars = new Set('#.*:$-_!@%^+>/'.split('').map(code));
var bracePairs = new Map().set(SQUARE_BRACE_L, SQUARE_BRACE_R).set(ROUND_BRACE_L, ROUND_BRACE_R).set(CURLY_BRACE_L, CURLY_BRACE_R);

/**
 * Extracts Emmet abbreviation from given string.
 * The goal of this module is to extract abbreviation from current editor’s line,
 * e.g. like this: `<span>.foo[title=bar|]</span>` -> `.foo[title=bar]`, where
 * `|` is a current caret position.
 * @param {String}  line A text line where abbreviation should be expanded
 * @param {Number}  [pos] Caret position in line. If not given, uses end-of-line
 * @param {Boolean} [lookAhead] Allow parser to look ahead of `pos` index for
 * searching of missing abbreviation parts. Most editors automatically inserts
 * closing braces for `[`, `{` and `(`, which will most likely be right after
 * current caret position. So in order to properly expand abbreviation, user
 * must explicitly move caret right after auto-inserted braces. Whith this option
 * enabled, parser will search for closing braces right after `pos`. Default is `true`
 * @return {Object} Object with `abbreviation` and its `location` in given line
 * if abbreviation can be extracted, `null` otherwise
 */
function extractAbbreviation(line, pos, lookAhead) {
	// make sure `pos` is within line range
	pos = Math.min(line.length, Math.max(0, pos == null ? line.length : pos));

	if (lookAhead == null || lookAhead === true) {
		pos = offsetPastAutoClosed(line, pos);
	}

	var c = void 0;
	var stream = new StreamReader(line);
	stream.pos = pos;
	var stack = [];

	while (!stream.sol()) {
		c = stream.peek();

		if (isCloseBrace(c)) {
			stack.push(c);
		} else if (isOpenBrace(c)) {
			if (stack.pop() !== bracePairs.get(c)) {
				// unexpected brace
				break;
			}
		} else if (has(stack, SQUARE_BRACE_R) || has(stack, CURLY_BRACE_R)) {
			// respect all characters inside attribute sets or text nodes
			stream.pos--;
			continue;
		} else if (isAtHTMLTag(stream) || !isAbbreviation(c)) {
			break;
		}

		stream.pos--;
	}

	if (!stack.length && stream.pos !== pos) {
		// found something, remove some invalid symbols from the
		// beginning and return abbreviation
		var abbreviation = line.slice(stream.pos, pos).replace(/^[\*\+\>\^]+/, '');
		return {
			abbreviation: abbreviation,
			location: pos - abbreviation.length
		};
	}
}

/**
 * Returns new `line` index which is right after characters beyound `pos` that
 * edditor will likely automatically close, e.g. }, ], and quotes
 * @param {String} line
 * @param {Number} pos
 * @return {Number}
 */
function offsetPastAutoClosed(line, pos) {
	// closing quote is allowed only as a next character
	if (isQuote(line.charCodeAt(pos))) {
		pos++;
	}

	// offset pointer until non-autoclosed character is found
	while (isCloseBrace(line.charCodeAt(pos))) {
		pos++;
	}

	return pos;
}

function has(arr, value) {
	return arr.indexOf(value) !== -1;
}

function isAbbreviation(c) {
	return c > 64 && c < 91 || // uppercase letter
	c > 96 && c < 123 // lowercase letter
	|| c > 47 && c < 58 // number
	|| specialChars.has(c); // special character
}

function isOpenBrace(c) {
	return c === SQUARE_BRACE_L || c === ROUND_BRACE_L || c === CURLY_BRACE_L;
}

function isCloseBrace(c) {
	return c === SQUARE_BRACE_R || c === ROUND_BRACE_R || c === CURLY_BRACE_R;
}

module.exports = extractAbbreviation;
