/**
 * Local module shims
 *
 * Some dependency installs in this environment miss top-level declaration
 * entrypoints (notably `@nestjs/core` and `bullmq`). These minimal shims keep
 * strict TypeScript builds working without affecting runtime behavior.
 */

declare module '@nestjs/core' {
  export const NestFactory: any;
}

declare module 'bullmq' {
  export class Queue {
    constructor(name: string, opts?: any);
    add(name: string, data?: any, opts?: any): Promise<any>;
    close(): Promise<void>;
  }

  export class Worker {
    constructor(name: string, processor: (job: any) => Promise<any>, opts?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    close(): Promise<void>;
  }
}
