"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectFacet = void 0;
var SelectFacet = /** @class */ (function () {
    function SelectFacet(_a) {
        var id = _a.id, name = _a.name, predicate = _a.predicate;
        this.facetId = id;
        this.name = name;
        this.predicate = predicate;
        this.value = "";
    }
    SelectFacet.prototype.generateSparql = function () {
        var whereClause = "BIND(<".concat(this.value, "> AS ?").concat(this.facetId, ")\n                         ?id ").concat(this.predicate, " <").concat(this.value, "> . ");
        return ("".concat(this.value ? whereClause : "", "\n      OPTIONAL { \n        ?id ").concat(this.predicate, " ?").concat(this.facetId, " . \n      }"));
    };
    SelectFacet.prototype.setValue = function (newValue) {
        this.value = newValue;
    };
    ;
    return SelectFacet;
}());
exports.SelectFacet = SelectFacet;
