"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckboxFacet = void 0;
var CheckboxFacet = /** @class */ (function () {
    function CheckboxFacet(_a) {
        var id = _a.id, name = _a.name, predicate = _a.predicate;
        this.facetId = id;
        this.name = name;
        this.predicate = predicate;
        this.values = [];
    }
    CheckboxFacet.prototype.generateSparql = function () {
        var _this = this;
        var optionalClause = "\n    OPTIONAL { \n      ?id ".concat(this.predicate, " ?").concat(this.facetId, " . \n    }");
        var whereClauses = this.values.length > 0 ? this.values.map(function (value) { return ("{\n         BIND(<".concat(value, "> AS ?").concat(_this.facetId, ")\n         ?id ").concat(_this.predicate, " <").concat(value, "> . \n      }")); }).join(" UNION ") : "";
        return whereClauses + optionalClause;
    };
    CheckboxFacet.prototype.setValue = function (newValues) {
        this.values = newValues;
    };
    ;
    return CheckboxFacet;
}());
exports.CheckboxFacet = CheckboxFacet;
