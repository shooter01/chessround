export default function ItemSX(active: boolean) {
  return {
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform .2s, filter .2s',
    transform: active ? 'scale(1.05)' : 'scale(1)',
    filter: active ? 'drop-shadow(0 0 12px rgba(0,0,0,0.3))' : 'none',
    '&:hover': {
      filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.4))',
      transform: 'scale(1.1)',
    },
  };
}
