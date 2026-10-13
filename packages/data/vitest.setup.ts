// Apollo 在 refetchQueries 找不到 active ObservableQuery 时,会通过
// invariant 往 stderr 打一条「An error occurred!」加上巨大的 URL-encoded
// 查询体。我们的 hook 测试故意不挂 ObservableQuery,所以这条警告每次都
// 会出现,纯噪音。把它过滤掉,真错误仍会照常透传。

const originalError = console.error;
const APOLLO_INVARIANT_MARKER = 'An error occurred!';

console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes(APOLLO_INVARIANT_MARKER)) {
    return;
  }
  originalError(...args);
};
