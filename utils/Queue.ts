// utils/Queue.ts

/**
 * @class Node
 * Represents a node in the queue.
 * @template T - The type of data stored in the node.
 */
class Node<T> {
  /**
   * The data stored in the node.
   * @type {T}
   */
  data: T;

  /**
   * A reference to the next node in the queue.
   * @type {Node<T> | null}
   */
  next: Node<T> | null;

  /**
   * Creates an instance of Node.
   * @param {T} data - The data to be stored in the node.
   */
  constructor(data: T) {
    this.data = data;
    this.next = null;
  }
}

/**
 * @class Queue
 * A generic First-In-First-Out (FIFO) queue data structure.
 * @template T - The type of elements held in the queue.
 */
export class Queue<T> {
  /**
   * A reference to the front of the queue.
   * @type {Node<T> | null}
   * @private
   */
  private front: Node<T> | null;

  /**
   * A reference to the back of the queue.
   * @type {Node<T> | null}
   * @private
   */
  private back: Node<T> | null;

  /**
   * The number of elements in the queue.
   * @type {number}
   * @private
   */
  private _size: number;

  /**
   * Creates an instance of Queue.
   */
  constructor() {
    this.front = null;
    this.back = null;
    this._size = 0;
  }

  /**
   * Adds an element to the back of the queue.
   * Time complexity: O(1)
   * @param {T} data - The element to add.
   */
  enqueue(data: T): void {
    const newNode = new Node(data);
    if (this.back) {
      this.back.next = newNode;
    }
    this.back = newNode;
    if (!this.front) {
      this.front = newNode;
    }
    this._size++;
  }

  /**
   * Removes and returns the element at the front of the queue.
   * Time complexity: O(1)
   * @returns {T | null} The removed element, or null if the queue is empty.
   */
  dequeue(): T | null {
    if (!this.front) {
      return null;
    }
    const data = this.front.data;
    this.front = this.front.next;
    if (!this.front) {
      this.back = null;
    }
    this._size--;
    return data;
  }

  /**
   * Returns the element at the front of the queue without removing it.
   * Time complexity: O(1)
   * @returns {T | null} The element at the front, or null if the queue is empty.
   */
  peek(): T | null {
    return this.front ? this.front.data : null;
  }

  /**
   * Checks if the queue is empty.
   * @returns {boolean} True if the queue is empty, false otherwise.
   */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Returns the number of elements in the queue.
   * @returns {number} The size of the queue.
   */
  size(): number {
    return this._size;
  }

  /**
   * Returns an array representation of the queue.
   * @returns {T[]} An array containing the elements of the queue in order.
   */
  toArray(): T[] {
    const result: T[] = [];
    let current = this.front;
    while (current) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }
}
