"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = propTypeCompositionHandler;

var _astTypes = require("ast-types");

var _getMemberValuePath = _interopRequireDefault(require("../utils/getMemberValuePath"));

var _resolveToModule = _interopRequireDefault(require("../utils/resolveToModule"));

var _resolveToValue = _interopRequireDefault(require("../utils/resolveToValue"));

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

/**
 * It resolves the path to its module name and adds it to the "composes" entry
 * in the documentation.
 */
function amendComposes(documentation, path, importer) {
  const moduleName = (0, _resolveToModule.default)(path, importer);

  if (moduleName) {
    documentation.addComposes(moduleName);
  }
}

function processObjectExpression(documentation, path, importer) {
  path.get('properties').each(function (propertyPath) {
    switch (propertyPath.node.type) {
      case _astTypes.namedTypes.SpreadElement.name:
        amendComposes(documentation, (0, _resolveToValue.default)(propertyPath.get('argument'), importer), importer);
        break;
    }
  });
}

function propTypeCompositionHandler(documentation, path, importer) {
  let propTypesPath = (0, _getMemberValuePath.default)(path, 'propTypes', importer);

  if (!propTypesPath) {
    return;
  }

  propTypesPath = (0, _resolveToValue.default)(propTypesPath, importer);

  if (!propTypesPath) {
    return;
  }

  switch (propTypesPath.node.type) {
    case _astTypes.namedTypes.ObjectExpression.name:
      processObjectExpression(documentation, propTypesPath, importer);
      break;

    default:
      amendComposes(documentation, propTypesPath, importer);
      break;
  }
}