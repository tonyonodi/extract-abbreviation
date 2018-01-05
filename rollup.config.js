import babel from "rollup-plugin-babel";
import babelrc from "babelrc-rollup";

let pkg = require("./package.json");

let plugins = [
	babel(
		babelrc({
			presets: [["es2015", { modules: false }]],
		})
	),
];

export default {
	entry: "./index.js",
	plugins: plugins,
	targets: [
		{ format: "cjs", dest: "dist/extract-abbreviation.cjs.js" },
		{ format: "es", dest: "dist/extract-abbreviation.es.js" },
	],
};
