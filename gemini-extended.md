# Gemini Music Streamer - Extended Features

This document outlines the implementation of a Queue-based playlist system and a Merge Sort algorithm for sorting songs, as requested.

## 1. Playlist Queue

### How it's used:

A `Queue` data structure has been implemented to manage the playback order of songs. This ensures a First-In-First-Out (FIFO) behavior for the playlist.

-   **Adding to Queue**: In the main song list, each song now has a "Add to Queue" button (`+` icon). Clicking this button enqueues the song into the `songQueue`.
-   **Playback**: The `Player` component always plays the song at the front of the queue. When a user clicks "Play" on a song, it is added to the queue, and if nothing is currently playing, the queue starts playing.
-   **Automatic Next Song**: When a song finishes, the `onSongEnd` event is triggered. This calls a function that dequeues the completed song and plays the next song in the queue.
-   **Queue Display**: A new "Up Next" panel has been added to the right side of the application to display the current songs in the queue.

### Data Structure: `Queue<T>`

The `Queue` is implemented using a linked list, which provides efficient O(1) time complexity for both enqueue and dequeue operations.

**File**: `utils/Queue.ts`

**Pseudocode:**

```
class Node<T>:
  data: T
  next: Node<T>

class Queue<T>:
  front: Node<T>
  back: Node<T>
  size: integer

  enqueue(data: T):
    newNode = new Node(data)
    if back is not null:
      back.next = newNode
    back = newNode
    if front is null:
      front = newNode
    size++

  dequeue(): T
    if front is null:
      return null
    data = front.data
    front = front.next
    if front is null:
      back = null
    size--
    return data

  peek(): T
    return front.data
```

### Time Complexity:

-   `enqueue(song)`: **O(1)**
-   `dequeue()`: **O(1)**
-   `peek()`: **O(1)**

## 2. Sorting Algorithm

### How it's used:

A `mergeSort` function has been implemented to allow users to sort the song list based on different criteria.

-   **Sorting Controls**: In the "Home" view, there are now buttons to sort the song list by:
    -   Play Count (descending)
    -   Release Date (newest first)
    -   Duration (longest first)
-   **Sorting Logic**: The `mergeSort` function is a higher-order function that accepts a custom `comparator` function. This allows it to sort the songs based on the selected criterion. The sorting is done "in-place" on the displayed list of songs, not on the playback queue.

### Algorithm: `mergeSort<T>`

The `mergeSort` algorithm is a comparison-based sorting algorithm with a time complexity of O(n log n). It is implemented recursively.

**File**: `utils/MergeSort.ts`

**Pseudocode:**

```
function mergeSort(arr, comparator):
  if length of arr <= 1:
    return arr

  middle = floor(length of arr / 2)
  left = slice arr from 0 to middle
  right = slice arr from middle to end

  sortedLeft = mergeSort(left, comparator)
  sortedRight = mergeSort(right, comparator)

  return merge(sortedLeft, sortedRight, comparator)

function merge(left, right, comparator):
  result = []
  leftIndex = 0
  rightIndex = 0

  while leftIndex < length of left and rightIndex < length of right:
    if comparator(left[leftIndex], right[rightIndex]) <= 0:
      add left[leftIndex] to result
      leftIndex++
    else:
      add right[rightIndex] to result
      rightIndex++

  concatenate remaining elements from left and right to result
  return result
```

### Time Complexity:

-   `mergeSort(songs, comparator)`: **O(n log n)**, where `n` is the number of songs.
