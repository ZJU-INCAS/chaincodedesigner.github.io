'use strict';

Blockly.Solidity = new Blockly.Generator('Solidity');

Blockly.Solidity.addReservedWords();

Blockly.Solidity.ORDER_ATOMIC = 0; // 0 "" ...
Blockly.Solidity.ORDER_NEW = 1.1; // new
Blockly.Solidity.ORDER_MEMBER = 1.2; // . []
Blockly.Solidity.ORDER_FUNCTION_CALL = 2; // ()
Blockly.Solidity.ORDER_INCREMENT = 3; // ++
Blockly.Solidity.ORDER_DECREMENT = 3; // --
Blockly.Solidity.ORDER_BITWISE_NOT = 4.1; // ~
Blockly.Solidity.ORDER_UNARY_PLUS = 4.2; // +
Blockly.Solidity.ORDER_UNARY_NEGATION = 4.3; // -
Blockly.Solidity.ORDER_LOGICAL_NOT = 4.4; // !
Blockly.Solidity.ORDER_TYPEOF = 4.5; // typeof
Blockly.Solidity.ORDER_VOID = 4.6; // void
Blockly.Solidity.ORDER_DELETE = 4.7; // delete
Blockly.Solidity.ORDER_DIVISION = 5.1; // /
Blockly.Solidity.ORDER_MULTIPLICATION = 5.2; // *
Blockly.Solidity.ORDER_MODULUS = 5.3; // %
Blockly.Solidity.ORDER_SUBTRACTION = 6.1; // -
Blockly.Solidity.ORDER_ADDITION = 6.2; // +
Blockly.Solidity.ORDER_BITWISE_SHIFT = 7; // << >> >>>
Blockly.Solidity.ORDER_RELATIONAL = 8; // < <= > >=
Blockly.Solidity.ORDER_IN = 8; // in
Blockly.Solidity.ORDER_INSTANCEOF = 8; // instanceof
Blockly.Solidity.ORDER_EQUALITY = 9; // == != === !==
Blockly.Solidity.ORDER_BITWISE_AND = 10; // &
Blockly.Solidity.ORDER_BITWISE_XOR = 11; // ^
Blockly.Solidity.ORDER_BITWISE_OR = 12; // |
Blockly.Solidity.ORDER_LOGICAL_AND = 13; // &&
Blockly.Solidity.ORDER_LOGICAL_OR = 14; // ||
Blockly.Solidity.ORDER_CONDITIONAL = 15; // ?:
Blockly.Solidity.ORDER_ASSIGNMENT = 16; // = += -= *= /= %= <<= >>= ...
Blockly.Solidity.ORDER_COMMA = 17; // ,
Blockly.Solidity.ORDER_NONE = 99; // (...)

/**
 * List of outer-inner pairings that do NOT require parentheses.
 * @type {!Array.<!Array.<number>>}
 */
Blockly.Solidity.ORDER_OVERRIDES = [
	// (foo()).bar -> foo().bar
	// (foo())[0] -> foo()[0]
	[Blockly.Solidity.ORDER_FUNCTION_CALL, Blockly.Solidity.ORDER_MEMBER],
	// (foo())() -> foo()()
	[Blockly.Solidity.ORDER_FUNCTION_CALL, Blockly.Solidity.ORDER_FUNCTION_CALL],
	// (foo.bar).baz -> foo.bar.baz
	// (foo.bar)[0] -> foo.bar[0]
	// (foo[0]).bar -> foo[0].bar
	// (foo[0])[1] -> foo[0][1]
	[Blockly.Solidity.ORDER_MEMBER, Blockly.Solidity.ORDER_MEMBER],
	// (foo.bar)() -> foo.bar()
	// (foo[0])() -> foo[0]()
	[Blockly.Solidity.ORDER_MEMBER, Blockly.Solidity.ORDER_FUNCTION_CALL],

	// !(!foo) -> !!foo
	[Blockly.Solidity.ORDER_LOGICAL_NOT, Blockly.Solidity.ORDER_LOGICAL_NOT],
	// a * (b * c) -> a * b * c
	[Blockly.Solidity.ORDER_MULTIPLICATION, Blockly.Solidity.ORDER_MULTIPLICATION],
	// a + (b + c) -> a + b + c
	[Blockly.Solidity.ORDER_ADDITION, Blockly.Solidity.ORDER_ADDITION],
	// a && (b && c) -> a && b && c
	[Blockly.Solidity.ORDER_LOGICAL_AND, Blockly.Solidity.ORDER_LOGICAL_AND],
	// a || (b || c) -> a || b || c
	[Blockly.Solidity.ORDER_LOGICAL_OR, Blockly.Solidity.ORDER_LOGICAL_OR]
];

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.Solidity.init = function(workspace) {
	// Create a dictionary of package to be printed before the code.
	Blockly.Solidity.import_ = Object.create(null);
	// Create a dictionary mapping desired function names in definitions_
	// to actual function names (to avoid collisions with user functions).
	Blockly.Solidity.functionNames_ = Object.create(null);

	if(!Blockly.Solidity.variableDB_) {
		Blockly.Solidity.variableDB_ =
			new Blockly.Names(Blockly.Solidity.RESERVED_WORDS_);
	} else {
		Blockly.Solidity.variableDB_.reset();
	}
	
	Blockly.Solidity.import_['package'] = '  \"fmt\"\n  \"strconv\"\n  \"github.com/hyperledger/fabric/core/chaincode/shim\"\n  pb \"github.com/hyperledger/fabric/protos/peer\"\n';
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Solidity.finish = function(code) {
	// Convert the imports dictionary into a list.
	var imports = [];
	for(var name in Blockly.Solidity.import_) {
		imports.push(Blockly.Solidity.import_[name]);
	}
	// Clean up temporary data.
	delete Blockly.Solidity.import_;
	delete Blockly.Solidity.functionNames_;
	Blockly.Solidity.variableDB_.reset();
	var contractName = 'contractName';
	return 'pragma solidity ^0.5.0;\n\n' + 'contract ' + contractName + '{\n  '+ code +'}\n'+ '\n\n'  ;
	//return 'package main\n' + 'import(\n' + imports.join('\n') + ')' + '\n\ntype SimpleChaincode struct {}\n'+ '\n\n'  + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Solidity.scrubNakedValue = function(line) {
	return line + ';\n';
};

/**
 * Encode a string as a properly escaped Solidity string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} Solidity string.
 * @private
 */
Blockly.Solidity.quote_ = function(string) {
	// Can't use Solidityog.string.quote since Solidityogle's style guide recommends
	// JS string literals use single quotes.
	string = string.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\\n')
		.replace(/'/g, '\\\'');
	return '\'' + string + '\'';
};

/**
 * Common tasks for generating Solidity from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Solidity code created for this block.
 * @return {string} Solidity code with comments and subsequent blocks added.
 * @private
 */
Blockly.Solidity.scrub_ = function(block, code) {
	var commentCode = '';
	// Only collect comments for blocks that aren't inline.
	if(!block.outputConnection || !block.outputConnection.targetConnection) {
		// Collect comment for this block.
		var comment = block.getCommentText();
		comment = Blockly.utils.wrap(comment, Blockly.Solidity.COMMENT_WRAP - 3);
		if(comment) {
			if(block.getProcedureDef) {
				// Use a comment block for function comments.
				commentCode += '/**\n' +
					Blockly.Solidity.prefixLines(comment + '\n', ' * ') +
					' */\n';
			} else {
				commentCode += Blockly.Solidity.prefixLines(comment + '\n', '// ');
			}
		}
		// Collect comments for all value arguments.
		// Don't collect comments for nested statements.
		for(var i = 0; i < block.inputList.length; i++) {
			if(block.inputList[i].type == Blockly.INPUT_VALUE) {
				var childBlock = block.inputList[i].connection.targetBlock();
				if(childBlock) {
					var comment = Blockly.Solidity.allNestedComments(childBlock);
					if(comment) {
						commentCode += Blockly.Solidity.prefixLines(comment, '// ');
					}
				}
			}
		}
	}
	var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
	var nextCode = Blockly.Solidity.blockToCode(nextBlock);
	return commentCode + code + nextCode;
};

/**
 * Gets a property and adjusts the value while taking into account indexing.
 * @param {!Blockly.Block} block The block.
 * @param {string} atId The property ID of the element to get.
 * @param {number=} opt_delta Value to add.
 * @param {boolean=} opt_negate Whether to negate the value.
 * @param {number=} opt_order The highest order acting on this value.
 * @return {string|number}
 */
Blockly.Solidity.getAdjusted = function(block, atId, opt_delta, opt_negate,
	opt_order) {
	var delta = opt_delta || 0;
	var order = opt_order || Blockly.Solidity.ORDER_NONE;
	if(block.workspace.options.oneBasedIndex) {
		delta--;
	}
	var defaultAtIndex = block.workspace.options.oneBasedIndex ? '1' : '0';
	if(delta > 0) {
		var at = Blockly.Solidity.valueToCode(block, atId,
			Blockly.Solidity.ORDER_ADDITION) || defaultAtIndex;
	} else if(delta < 0) {
		var at = Blockly.Solidity.valueToCode(block, atId,
			Blockly.Solidity.ORDER_SUBTRACTION) || defaultAtIndex;
	} else if(opt_negate) {
		var at = Blockly.Solidity.valueToCode(block, atId,
			Blockly.Solidity.ORDER_UNARY_NEGATION) || defaultAtIndex;
	} else {
		var at = Blockly.Solidity.valueToCode(block, atId, order) ||
			defaultAtIndex;
	}

	if(Blockly.isNumber(at)) {
		// If the index is a naked number, adjust it right now.
		at = parseFloat(at) + delta;
		if(opt_negate) {
			at = -at;
		}
	} else {
		// If the index is dynamic, adjust it in code.
		if(delta > 0) {
			at = at + ' + ' + delta;
			var innerOrder = Blockly.Solidity.ORDER_ADDITION;
		} else if(delta < 0) {
			at = at + ' - ' + -delta;
			var innerOrder = Blockly.Solidity.ORDER_SUBTRACTION;
		}
		if(opt_negate) {
			if(delta) {
				at = '-(' + at + ')';
			} else {
				at = '-' + at;
			}
			var innerOrder = Blockly.Solidity.ORDER_UNARY_NEGATION;
		}
		innerOrder = Math.floor(innerOrder);
		order = Math.floor(order);
		if(innerOrder && order >= innerOrder) {
			at = '(' + at + ')';
		}
	}
	return at;
};

Blockly.Solidity.chaincode_init = function(block) {
	// TODO: Assemble Solidity into code variable.
	var code = '';
	code += `constructor(address account) Ownable(account) public {}\n`;
	var branch = Blockly.Solidity.statementToCode(block, 'init_func');
	branch = Blockly.Solidity.addLoopTrap(branch, block.id);
	code += branch;
	code += '    return shim.Success(nil)\n}\n';

	return code;
};

Blockly.Solidity.chaincode_body = function(block) {
	// TODO: Assemble Solidity into code variable.
	var code = `
		solidity body\n`;

	var branch = Blockly.Solidity.statementToCode(block, 'body_func');
	branch = Blockly.Solidity.addLoopTrap(branch, block.id);
	code += branch;
	
	code += 'function main() return (){ \n  err := shim.Start(new(SimpleChaincode))\n  if err != nil {\n';
	//code += '    fmt.Printf("Error starting Simple chaincode: %s", err)\n  }\n}\n';
	return code + '\n';
};
Blockly.Solidity.chaincode_init_body = function(block) {
	var statements_init_func = Blockly.Solidity.statementToCode(block, 'init_func');
	var statements_body_func = Blockly.Solidity.statementToCode(block, 'body_func');
	// TODO: Assemble Solidity into code variable.

	var code = '';
	code += 'function bodyinit ( ) return (){ \n';
	//code += 'fmt.Println("ex02 Init")\n';
	var branch = Blockly.Solidity.statementToCode(block, 'init_func');
	branch = Blockly.Solidity.addLoopTrap(branch, block.id);
	code += branch;
	code += 'return shim.Sufffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffccess(nil)\n}\n';
	
	code += `fhasdfasdfas
	fadfadf
	adfasdfas
	asdfasdfasdf
	adfasdfas`;

	var branch = Blockly.Solidity.statementToCode(block, 'body_func');
	branch = Blockly.Solidity.addLoopTrap(branch, block.id);
	code += branch;
	
	code += 'func main() { \n  err := shim.Start(new(SimpleChaincode))\n  if err != nil {\n';
	code += '    fmt.Printf("Error starting Simple chaincode: %s", err)\n  }\n}\n';
	
	return code + '\n';
};
Blockly.Solidity.chaincode_invoke = function(block) {
	var checkbox_check_invoke_security = block.getFieldValue('check_invoke_security') == 'TRUE';
	var usera_name = Blockly.Solidity.valueToCode(block, 'user_A', Blockly.Solidity.ORDER_ATOMIC);
	var userb_name = Blockly.Solidity.valueToCode(block, 'user_B', Blockly.Solidity.ORDER_ATOMIC);
	var money = Blockly.Solidity.valueToCode(block, 'money_num', Blockly.Solidity.ORDER_ATOMIC);
	if (money[0]=="-"){
		alert("账金额不能为负数?");
	}else if(money.length>9){
		alert("金额超限！");
	}
	// TODO: Assemble Solidity into code variable.	
	var code = `function invoke (t *SimpleChaincode) {

	}`
	return code;
};
Blockly.Solidity.chaincode_query = function(block) {
	var checkbox_check_query_security = block.getFieldValue('check_query_security') == 'TRUE';
	var value_user_query = Blockly.Solidity.valueToCode(block, 'user_Query', Blockly.Solidity.ORDER_ATOMIC);
	// TODO: Assemble Solidity into code variable.
	var functionName = 'a';
	var code =`function record(string _id, string _catEvent, string _optKey, string _optVal, string _dsc, string _data) onlyOwner returns(bool){
	RecordIndex ix = recordIndexs[_id];
	string catEvent = ix.catEvent;
	require(keccak256("") == keccak256(catEvent), "id已存在");

	records[_catEvent].push(Record(_optKey, _optVal, _dsc, _data, now));
	recordIndexs[_id] = RecordIndex(_catEvent, records[_catEvent].length-1);

	return true;
	}`
	code += 'function '+ functionName +' (t *SimpleChaincode) Query(stub shim.ChaincodeStub, args []string) pb.Response {\n';

	code += '    user_name = \"' + value_user_query + '\"\n';
	if(checkbox_check_query_security == true) {
		code += '    if user_name_val == nil {\n';
		code += '    }\n';
	}

	code += '}\n';
	return code;
};
Blockly.Solidity.chaincode_delete = function(block) {
	var checkbox_check_delete_security = block.getFieldValue('check_delete_security') == 'TRUE';
	var value_user_delete = Blockly.Solidity.valueToCode(block, 'user_Delete', Blockly.Solidity.ORDER_ATOMIC);
	// TODO: Assemble Solidity into code variable.

	var code = 'function delete(variable){\n';
	code += '    user_name := \"' + value_user_delete + '\"\n';
	code += '    err := stub.DelState(user_name)\n';
	code += '}\n';
	return code;
};
Blockly.Solidity.set_value = function(block) {
	var checkbox_flag = block.getFieldValue('check_set_security') == 'TRUE';
	var variable_name = Blockly.Solidity.variableDB_.getName(block.getFieldValue('data'), Blockly.Variables.NAME_TYPE);
	var variable_value = Blockly.Solidity.valueToCode(block, 'VARIABLE', Blockly.Solidity.ORDER_ATOMIC);
	// TODO: Assemble Solidity into code variable.
	var valuable_val = variable_name + 'val';
	var valuable_err = 'err_' + variable_name;

	var code = `${variable_name}\ solidity contract variables init${valuable_val}`
	if(checkbox_flag == true) {
		code += 'if ' + valuable_err + '!= nil { \n	return shim.Error("Expecting integer value for asset holding")\n}\n';
	}
	
	code += valuable_err + ' = stub.PutState(' + variable_name + ', []byte(strconv.Itoa(' + variable_value + ')))\n';
	code += 'if ' + valuable_err + ' != nil {\n  return shim.Error(' + valuable_err + '.Error())\n}\n';
	return code;
};
Blockly.Solidity.controls_if = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  do {
    conditionCode = Blockly.Solidity.valueToCode(block, 'IF' + n,
      Blockly.Solidity.ORDER_NONE) || 'false';
    branchCode = Blockly.Solidity.statementToCode(block, 'DO' + n);
    code += (n > 0 ? ' else ' : '') +
        'if  ' + conditionCode + '  {\n' + branchCode + '}';

    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE')) {
    branchCode = Blockly.Solidity.statementToCode(block, 'ELSE');
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Blockly.Solidity.controls_ifelse = Blockly.Solidity['controls_if'];

Blockly.Solidity.logic_compare = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.Solidity.ORDER_EQUALITY : Blockly.Solidity.ORDER_RELATIONAL;
  var argument0 = Blockly.Solidity.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Solidity.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Solidity.logic_boolean = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.Solidity.ORDER_ATOMIC];
};

Blockly.Solidity.controls_repeat_ext = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(Number(block.getFieldValue('TIMES')));
  } else {
    // External number.
    var repeats = Blockly.Solidity.valueToCode(block, 'TIMES',
        Blockly.Solidity.ORDER_ASSIGNMENT) || '0';
  }
  var branch = Blockly.Solidity.statementToCode(block, 'DO');
  branch = Blockly.Solidity.addLoopTrap(branch, block.id);
  var code = '';
  var loopVar = Blockly.Solidity.variableDB_.getDistinctName(
      'count', Blockly.Variables.NAME_TYPE);
  var endVar = repeats;
  if (!repeats.match(/^\w+$/) && !Blockly.isNumber(repeats)) {
    var endVar = Blockly.Solidity.variableDB_.getDistinctName(
        'repeat_end', Blockly.Variables.NAME_TYPE);
    code += endVar + ' = ' + repeats + ';\n';
  }
  code += 'for ' + loopVar + ' := 0; ' +
      loopVar + ' < ' + endVar + '; ' +
      loopVar + '++ {\n' +
      branch + '}\n';
  return code;
};

Blockly.Solidity.controls_whileUntil = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = Blockly.Solidity.valueToCode(block, 'BOOL',
      until ? Blockly.Solidity.ORDER_LOGICAL_NOT :
      Blockly.Solidity.ORDER_NONE) || 'false';
  var branch = Blockly.Solidity.statementToCode(block, 'DO');
  branch = Blockly.Solidity.addLoopTrap(branch, block.id);
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'for ' + argument0 + ' {\n' + branch + '}\n';
};

Blockly.Solidity.controls_for = function(block) {
  // For loop.
  var variable0 = Blockly.Solidity.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.Solidity.valueToCode(block, 'FROM',
      Blockly.Solidity.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.Solidity.valueToCode(block, 'TO',
      Blockly.Solidity.ORDER_ASSIGNMENT) || '0';
  var increment = Blockly.Solidity.valueToCode(block, 'BY',
      Blockly.Solidity.ORDER_ASSIGNMENT) || '1';
  var branch = Blockly.Solidity.statementToCode(block, 'DO');
  branch = Blockly.Solidity.addLoopTrap(branch, block.id);
  var code;
  if (Blockly.isNumber(argument0) && Blockly.isNumber(argument1) &&
      Blockly.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = parseFloat(argument0) <= parseFloat(argument1);
    code = 'for ' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
        variable0;
    var step = Math.abs(parseFloat(increment));
    if (step == 1) {
      code += up ? '++' : '--';
    } else {
      code += (up ? ' += ' : ' -= ') + step;
    }
    code += ' {\n' + branch + '}\n';
  } else {
    code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var startVar = argument0;
    if (!argument0.match(/^\w+$/) && !Blockly.isNumber(argument0)) {
      startVar = Blockly.Solidity.variableDB_.getDistinctName(
          variable0 + '_start', Blockly.Variables.NAME_TYPE);
      code += 'var ' + startVar + ' = ' + argument0 + ';\n';
    }
    var endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.isNumber(argument1)) {
      var endVar = Blockly.Solidity.variableDB_.getDistinctName(
          variable0 + '_end', Blockly.Variables.NAME_TYPE);
      code += 'var ' + endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    var incVar = Blockly.Solidity.variableDB_.getDistinctName(
        variable0 + '_inc', Blockly.Variables.NAME_TYPE);
    code += 'var ' + incVar + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += 'Math.abs(' + increment + ');\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += Blockly.Solidity.INDENT + incVar + ' = -' + incVar + ';\n';
    code += '}\n';
    code += 'for (' + variable0 + ' = ' + startVar + '; ' +
        incVar + ' >= 0 ? ' +
        variable0 + ' <= ' + endVar + ' : ' +
        variable0 + ' >= ' + endVar + '; ' +
        variable0 + ' += ' + incVar + ') {\n' +
        branch + '}\n';
  }
  return code;
};

Blockly.Solidity.math_number = function(block) {
  // Numeric value.
  var code = parseFloat(block.getFieldValue('NUM'));
  return [code, Blockly.Solidity.ORDER_ATOMIC];
};

Blockly.Solidity.math_arithmetic = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', Blockly.Solidity.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.Solidity.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.Solidity.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.Solidity.ORDER_DIVISION],
    'POWER': [null, Blockly.Solidity.ORDER_COMMA]  // Handle power separately.
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.Solidity.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Solidity.valueToCode(block, 'B', order) || '0';
  var code;
  // Power in Solidity requires a special case since it has no operator.
  if (!operator) {
    code = 'Math.pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.Solidity.ORDER_FUNCTION_CALL];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.Solidity.text  = function(block) {
  // Text value.
  var code = Blockly.Solidity.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.Solidity.ORDER_ATOMIC];
};

Blockly.Solidity.text_print = function(block) {
  // Print statement.
  var msg = Blockly.Solidity.valueToCode(block, 'TEXT',
      Blockly.Solidity.ORDER_NONE) || '\'\'';
  return 'fmt.Printf(\"' + msg.slice(1,msg.length-1) + '\");\\n';
};

Blockly.Solidity.variables_get  = function(block) {
  // Variable getter.
  var code = Blockly.Solidity.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.Solidity.ORDER_ATOMIC];
};

Blockly.Solidity.variables_set = function(block) {
  // Variable setter.
  var argument0 = Blockly.Solidity.valueToCode(block, 'VALUE',
      Blockly.Solidity.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.Solidity.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + ';\n';
};
