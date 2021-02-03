import * as convert from 'color-convert';
import { HSL } from 'color-convert/conversions';
import { AppThemeState } from './States';

interface ColorGetOptions {
	theme?: AppThemeState;
	invert?: boolean;

	opacity?: number;
	saturation?: number;
	lightness?: number;
}

export default class Color<
	T extends string = string,
	U extends string = string,
	I extends U[] = U[]
> {
	colors: HSL[] = [];

	constructor(required: T, ...hexColors: I) {
		this.colors = [
			convert.hex.hsl(required),
			...hexColors.map((hexColor) => convert.hex.hsl(hexColor)),
		];
	}

	get(options: ColorGetOptions = {}): T {
		if (options.invert) {
			if (options.theme === AppThemeState.light)
				options.theme = AppThemeState.dark;
			if (options.theme === AppThemeState.dark)
				options.theme = AppThemeState.light;
		}

		const themeId =
			options.theme === undefined || !(options.theme in this.colors)
				? 0
				: options.theme;

		const values = [
			this.colors[themeId][0],
			Math.max(
				Math.min(
					this.colors[themeId][1] + (options.saturation ?? 0),
					100
				),
				0
			),
			Math.max(
				Math.min(
					this.colors[themeId][2] + (options.lightness ?? 0),
					100
				),
				0
			),
			options?.opacity || 1,
		];

		const hsla = `hsla(${values[0]}, ${values[1]}%, ${values[2]}%, ${values[3]})`;

		return this.isT(hsla) ? hsla : ('' as T);
	}

	// eslint-disable-next-line class-methods-use-this
	private isT(foo: string): foo is T {
		return typeof foo === 'string';
	}
}
