function removeDuplicates(arr) {
    // Используем Set для удаления дубликатов за O(n)
    return [...new Set(arr)];
}

// Пример использования
const data = [1,2,3,2,4,1,5,3];
console.log(removeDuplicates(data)); // [1,2,3,4,5]
  