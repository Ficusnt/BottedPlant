import fs
import path

file_path = path.join('Src', 'bpCommand.js')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "const { cmdLeave } = require('./cmdLeave');"

if import_line not in content:
    content = content.replace(
        "const { queueEmbed, formatDuration } = require('./embeds');",
        "const { queueEmbed, formatDuration } = require('./embeds');\nconst { cmdLeave } = require('./cmdLeave');"
    )
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Import added successfully')
else:
    print('Import already exists')