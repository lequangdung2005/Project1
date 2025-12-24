// utils/MergeSort.ts

type Comparator<T> = (a: T, b: T) => number;

/**
 * Sorts an array using the merge sort algorithm.
 * Time complexity: O(n log n)
 * @template T - The type of elements in the array.
 * @param {T[]} arr - The array to sort.
 * @param {Comparator<T>} comparator - The function to compare two elements.
 * @returns {T[]} A new array containing the sorted elements.
 */
export function mergeSort<T>(arr: T[], comparator: Comparator<T>): T[] {
  if (arr.length <= 1) {
    return arr;
  }

  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);

  const sortedLeft = mergeSort(left, comparator);
  const sortedRight = mergeSort(right, comparator);

  return merge(sortedLeft, sortedRight, comparator);
}

/**
 * Merges two sorted arrays into a single sorted array.
 * @template T - The type of elements in the arrays.
 * @param {T[]} left - The left sorted array.
 * @param {T[]} right - The right sorted array.
 * @param {Comparator<T>} comparator - The function to compare two elements.
 * @returns {T[]} The merged and sorted array.
 */
function merge<T>(left: T[], right: T[], comparator: Comparator<T>): T[] {
  const result: T[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (comparator(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  // Concatenate the remaining elements
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}
