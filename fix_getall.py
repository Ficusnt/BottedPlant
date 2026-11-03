with open('src/player.js', 'r') as f:
    content = f.read()

print('Found:', 'getAll' in content)
print('Replacing...')
content = content.replace('player.extractors.getAll().map(e => e.identifier)', '[...player.extractors.store.values()].map(e => e.identifier)')

with open('src/player.js', 'w') as f:
    f.write(content)

print('Done')