import { ClassValue, clsx } from 'clsx'
import { ParsedUrlQuery } from 'querystring'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import _ from 'lodash'

export const formatDate = (date: number) =>
	dayjs(date).format('MMMM D, YYYY h:mm A')

export const calculateDateRange = (date: Date, years: number) => {
	const clonedDate = _.cloneDeep(date)
	clonedDate.setFullYear(clonedDate.getFullYear() + years)
	return clonedDate
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export type CollectionPredicate = (
	item?: any,
	index?: number,
	collection?: any[],
) => boolean

export function isUndefined(value: any): value is undefined {
	return typeof value === 'undefined'
}

export function isNull(value: any): value is null {
	return value === null
}

export function isNumber(value: any): value is number {
	return typeof value === 'number'
}

export function isNumberFinite(value: any): value is number {
	return isNumber(value) && Number.isFinite(value)
}

// Not strict positive
export function isPositive(value: number): boolean {
	return value >= 0
}

export function isInteger(value: number): boolean {
	// No rest, is an integer
	return value % 1 === 0
}

export function isNil(value: any): value is null | undefined {
	return value === null || typeof value === 'undefined'
}

export function isString(value: any): value is string {
	return typeof value === 'string'
}

export function isObject(value: any): boolean {
	return value !== null && typeof value === 'object'
}

export function isEmptyObject(value: any): boolean {
	return isObject(value) && Object.keys(value).length === 0
}

export function isArray(value: any): boolean {
	return Array.isArray(value)
}

export function isFunction(value: any): boolean {
	return typeof value === 'function'
}

export function toDecimal(value: number, decimal: number): number {
	return Math.round(value * 10 ** decimal) / 10 ** decimal
}

export function upperFirst(value: string): string {
	return value.slice(0, 1).toUpperCase() + value.slice(1)
}

export function leftPad(str: string, len: number = 0, ch: any = ' ') {
	str = String(str)
	ch = toString(ch)
	let i = -1
	const length = len - str.length

	while (++i < length && str.length + ch.length <= len) {
		str = ch + str
	}

	return str
}

export function rightPad(str: string, len: number = 0, ch: any = ' ') {
	str = String(str)
	ch = toString(ch)

	let i = -1
	const length = len - str.length

	while (++i < length && str.length + ch.length <= len) {
		str += ch
	}

	return str
}

export function toString(value: number | string) {
	return `${value}`
}

export function pad(str: string, len: number = 0, ch: any = ' '): string {
	str = String(str)
	ch = toString(ch)
	let i = -1
	const length = len - str.length

	let left = true
	while (++i < length) {
		const l =
			str.length + ch.length <= len ? str.length + ch.length : str.length + 1

		if (left) {
			str = leftPad(str, l, ch)
		} else {
			str = rightPad(str, l, ch)
		}

		left = !left
	}

	return str
}

export function flatten(input: any[], index: number = 0): any[] {
	if (index >= input.length) {
		return input
	}

	if (isArray(input[index])) {
		return flatten(
			input.slice(0, index).concat(input[index], input.slice(index + 1)),
			index,
		)
	}

	return flatten(input, index + 1)
}

export function getProperty(value: { [key: string]: any }, key: string): any {
	if (isNil(value) || !isObject(value)) {
		return undefined
	}

	const keys: string[] = key.split('.')
	let result: any = value[keys.shift()!]

	for (const key of keys) {
		if (isNil(result) || !isObject(result)) {
			return undefined
		}

		result = result[key]
	}

	return result
}

export function sum(input: Array<number>, initial = 0): number {
	return input.reduce(
		(previous: number, current: number) => previous + current,
		initial,
	)
}

export function shuffle(input: any): any {
	if (!isArray(input)) {
		return input
	}

	const copy = [...input]

	for (let i = copy.length; i; --i) {
		const j = Math.floor(Math.random() * i)
		const x = copy[i - 1]
		copy[i - 1] = copy[j]
		copy[j] = x
	}

	return copy
}

export function deepIndexOf(collection: any[], value: any) {
	let index = -1
	const { length } = collection

	while (++index < length) {
		if (deepEqual(value, collection[index])) {
			return index
		}
	}

	return -1
}

export function deepEqual(a: any, b: any) {
	if (a === b) {
		return true
	}

	if (!(typeof a === 'object' && typeof b === 'object')) {
		return a === b
	}

	const keysA = Object.keys(a)
	const keysB = Object.keys(b)

	if (keysA.length !== keysB.length) {
		return false
	}

	// Test for A's keys different from B.
	const hasOwn = Object.prototype.hasOwnProperty
	for (let i = 0; i < keysA.length; i++) {
		const key = keysA[i]
		if (!hasOwn.call(b, keysA[i]) || !deepEqual(a[key], b[key])) {
			return false
		}
	}

	return true
}

export function isDeepObject(object: any) {
	return object.__isDeepObject__
}

export function wrapDeep(object: any) {
	return new DeepWrapper(object)
}

export function unwrapDeep(object: any) {
	if (isDeepObject(object)) {
		return object.data
	}

	return object
}

export class DeepWrapper {
	public __isDeepObject__: boolean = true

	constructor(public data: any) { }
}

export function count(input: any): any {
	if (!isArray(input) && !isObject(input) && !isString(input)) {
		return input
	}

	if (isObject(input)) {
		return Object.keys(input).map(value => input[value]).length
	}

	return input.length
}

export function empty(input: any): any {
	if (!isArray(input)) {
		return input
	}

	return input.length === 0
}

export function every(input: any, predicate: CollectionPredicate) {
	if (!isArray(input) || !predicate) {
		return input
	}

	let result = true
	let i = -1

	while (++i < input.length && result) {
		result = predicate(input[i], i, input)
	}

	return result
}

export function takeUntil(input: any[], predicate: CollectionPredicate) {
	let i = -1
	const result: any = []
	while (++i < input.length && !predicate(input[i], i, input)) {
		result[i] = input[i]
	}

	return result
}

type ByteUnit = 'B' | 'GB' | 'KB' | 'MB' | 'TB' | 'kB'

export function formatByte(
	input: any,
	decimal: number = 0,
	from: ByteUnit = 'B',
	to?: ByteUnit,
) {
	if (
		!(
			isNumberFinite(input) &&
			isNumberFinite(decimal) &&
			isInteger(decimal) &&
			isPositive(decimal)
		)
	) {
		return input
	}

	let bytes = input
	let unit = from
	while (unit !== 'B') {
		bytes *= 1024
		unit = ByteTo[unit].prev!
	}

	if (to) {
		const format = ByteTo[to]

		const result = toDecimal(calculateResult(format, bytes), decimal)

		return formatResult(result, to)
	}

	for (const key in ByteTo) {
		if (ByteTo.hasOwnProperty(key)) {
			const format = ByteTo[key]
			if (bytes < format.max) {
				const result = toDecimal(calculateResult(format, bytes), decimal)
				return formatResult(result, key)
			}
		}
	}
}

const ByteTo: { [key: string]: { max: number; prev?: ByteUnit } } = {
	B: { max: 1024 },
	kB: { max: 1024 ** 2, prev: 'B' },
	KB: { max: 1024 ** 2, prev: 'B' }, // Backward compatible
	MB: { max: 1024 ** 3, prev: 'kB' },
	GB: { max: 1024 ** 4, prev: 'MB' },
	TB: { max: Number.MAX_SAFE_INTEGER, prev: 'GB' },
}

const formatResult = (result: number, unit: string): string => {
	return `${result} ${unit}`
}

const calculateResult = (
	format: { max: number; prev?: ByteUnit },
	bytes: number,
) => {
	const prev = format.prev ? ByteTo[format.prev] : undefined
	return prev ? bytes / prev.max : bytes
}

export function getRootName(pathName: string) {
	if (!pathName) return ''
	const paths = pathName.split('/')
	return paths[0]
}

export function getParentRoute(pathName: string) {
	if (!pathName) return ''
	const paths = pathName.split('/')
	paths.pop()
	return paths.join('/')
}

export function getPageSize(searchParams: ParsedUrlQuery) {
	const page =
		typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1
	const pageSize =
		typeof searchParams.pageSize === 'string'
			? parseInt(searchParams.pageSize, 10)
			: 20
	const id = Array.isArray(searchParams.id)
		? parseInt(searchParams.id[0], 10)
		: 0
	return { id, page, pageSize }
}

export function getChildRoute(pathName: string) {
	const match = pathName.match(/\/(\d+)/)
	if (match) {
		const number = parseInt(match[1], 10)
		if (!isNaN(number)) {
			return number
		}
	}
	return 0
}

export function convertPropertyNamesToLowercase<T>(obj: T): T {
	const newObj = {} as T

	for (const key in obj) {
		if (Object.hasOwnProperty.call(obj, key)) {
			const newKey = key[0].toLowerCase() + key.slice(1)
			newObj[newKey as keyof T] = obj[key]
		}
	}

	return newObj
}


export const formatReadableDate = (isoDateString: string): string => {
	const date = new Date(isoDateString)

	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	}

	const formatter = new Intl.DateTimeFormat('en-US', options)
	return formatter.format(date)
}

export const timeAgo = (date: Date | string): string => {
	const now = new Date();
	const updatedAt = new Date(date);
	const diff = Math.max(0, now.getTime() - updatedAt.getTime());

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
	const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));

	if (seconds < 60) {
		return "just now";
	} else if (minutes < 60) {
		return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
	} else if (days < 30) {
		return `${days} day${days !== 1 ? 's' : ''} ago`;
	} else if (months < 12) {
		return `${months} month${months !== 1 ? 's' : ''} ago`;
	} else {
		return `${years} year${years !== 1 ? 's' : ''} ago`;
	}
};

export const initialName = (name: string) =>
	name
		? name
			.split(' ')
			.slice(0, 2)
			.map(word => word[0])
			.join('')
			.toUpperCase()
		: name

export const randomColor = () => `hsl(${Math.random() * 360}, 70%, 80%)`

export function isColorDark(hexCode: string): boolean {
	// Parse the hexadecimal color code into RGB components
	const r = hexToDec(hexCode.substring(1, 3))
	const g = hexToDec(hexCode.substring(3, 5))
	const b = hexToDec(hexCode.substring(5, 7))

	// Calculate relative luminance as per WCAG formula
	const relativeLuminance =
		0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)

	// Check if color is dark based on relative luminance
	return relativeLuminance <= 0.5
}

function hexToDec(hex: string): number {
	return parseInt(hex, 16)
}

export function mergeRefs<T = any>(
	...refs: React.Ref<T>[]
): React.RefCallback<T> {
	return (value: T) => {
		refs.forEach(ref => {
			if (typeof ref === 'function') {
				ref(value)
			} else if (ref && typeof ref === 'object') {
				; (ref as React.MutableRefObject<T | null>).current = value
			}
		})
	}
}

export function convertToSmartQuotes(text: string): string {
	return text
	  .replace(/"(\S)/g, '“$1')
	  .replace(/(\S)"(\s|$)/g, '$1”$2')
	  .replace(/'(\S)/g, '‘$1')
	  .replace(/(\S)'(\s|$)/g, '$1’$2')
	  .replace(/--/g, '— ')
	  .replace(/`/g, "'")
	  .replace(/\. (\w)/g, (_match, p1) => `. ${p1.toUpperCase()}`)
	  .replace(/\.{3}/g, '… ');
  }