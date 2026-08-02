// global-error.tsx is pinned to app/ by the file convention, so it can't
// have the usual sibling copy.ts inside its own directory (app/copy.ts
// would read as "copy for the whole app tree"). This is that file, named
// for its one consumer.
export const globalErrorCopy = {
  title: "Something went wrong · Workout",
} as const;
