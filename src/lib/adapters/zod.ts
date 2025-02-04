import type { AnyZodObject, ZodDefault, ZodEffects, ZodType, ZodTypeDef, ZodUnion } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import {
	type AdapterOptions,
	type ValidationAdapter,
	type Infer,
	type InferIn,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import { zodToJsonSchema as zodToJson, type Options } from 'zod-to-json-schema';
import { memoize } from '$lib/memoize.js';

const defaultOptions: Partial<Options> = {
	dateStrategy: 'integer',
	pipeStrategy: 'output'
} as const;

/* @__NO_SIDE_EFFECTS__ */
export const zodToJSONSchema = (...params: Parameters<typeof zodToJson>) => {
	params[1] = typeof params[1] == 'object' ? { ...defaultOptions, ...params[1] } : defaultOptions;
	return zodToJson(...params) as JSONSchema7;
};

type ZodObjectUnion<T extends AnyZodObject> = ZodUnion<
	[ZodValidation<T>, ZodValidation<T>, ...ZodValidation<T>[]]
>;

type ZodObjectType = ZodType<Record<string, unknown>, ZodTypeDef, Record<string, unknown>>;

type ZodObjectTypes = AnyZodObject | ZodObjectUnion<AnyZodObject> | ZodObjectType;

export type ZodValidation<T extends ZodObjectTypes> =
	| T
	| ZodEffects<T>
	| ZodEffects<ZodEffects<T>>
	| ZodEffects<ZodEffects<ZodEffects<T>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	| ZodDefault<T>
	| ZodDefault<ZodEffects<T>>
	| ZodDefault<ZodEffects<ZodEffects<T>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	| ZodDefault<
			ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	  >;

async function validate<T extends ZodValidation<ZodObjectTypes>>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = await schema.safeParseAsync(data);
	if (result.success) {
		return {
			data: result.data as Infer<T>,
			success: true
		};
	}
	return {
		issues: result.error.issues.map(({ message, path }) => ({ message, path })),
		success: false
	};
}

function _zod<T extends ZodValidation<ZodObjectTypes>>(
	schema: T,
	options?: AdapterOptions<T>
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'zod',
		validate: async (data) => validate(schema, data),
		jsonSchema: options?.jsonSchema ?? zodToJSONSchema(schema),
		defaults: options?.defaults
	});
}

function _zodClient<T extends ZodValidation<ZodObjectTypes>>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'zod',
		validate: async (data) => validate(schema, data)
	};
}

export const zod = /* @__PURE__ */ memoize(_zod);
export const zodClient = /* @__PURE__ */ memoize(_zodClient);
