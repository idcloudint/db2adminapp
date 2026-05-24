"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Severity = exports.HealthStatus = void 0;
// Health Status Types
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["WARNING"] = "warning";
    HealthStatus["CRITICAL"] = "critical";
    HealthStatus["UNKNOWN"] = "unknown";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
var Severity;
(function (Severity) {
    Severity["P0"] = "P0";
    Severity["P1"] = "P1";
    Severity["P2"] = "P2";
    Severity["P3"] = "P3"; // Low - Cosmetic or minor issues
})(Severity || (exports.Severity = Severity = {}));
// Made with Bob
//# sourceMappingURL=index.js.map