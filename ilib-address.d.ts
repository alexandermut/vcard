declare module 'ilib-address' {
    export class Address {
        constructor(address: string, options?: { locale?: string });
        streetAddress?: string;
        locality?: string;
        postalCode?: string;
        country?: string;
        region?: string;
    }

    export class AddressFmt {
        constructor(options?: { locale?: string });
        format(address: Address): string;
    }
}
