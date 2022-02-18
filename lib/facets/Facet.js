"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFacet = void 0;
var SelectFacet_1 = require("./SelectFacet");
var CheckboxFacet_1 = require("./CheckboxFacet");
function buildFacet(configuration) {
    switch (configuration.type) {
        case "select":
            return new SelectFacet_1.SelectFacet(configuration);
        case "checkbox":
            return new CheckboxFacet_1.CheckboxFacet(configuration);
    }
}
exports.buildFacet = buildFacet;
