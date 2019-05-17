[{]: <helper> (diffStep "root")

#### Test tortilla project

##### Added .gitignore
```diff
@@ -0,0 +1,2 @@
+┊ ┊1┊node_modules
+┊ ┊2┊npm-debug.log🚫↵
```

##### Added .tortilla&#x2F;manuals&#x2F;templates&#x2F;root.tmpl
```diff
@@ -0,0 +1 @@
+┊ ┊1┊A newly created Tortilla project. For more information, see https://github.com/Urigo/tortilla.🚫↵
```

##### Added .tortilla&#x2F;manuals&#x2F;views&#x2F;root.md
```diff
@@ -0,0 +1 @@
+┊ ┊1┊../../../README.md🚫↵
```

##### Added README.md
```diff
@@ -0,0 +1,9 @@
+┊ ┊1┊# Tortilla Project
+┊ ┊2┊
+┊ ┊3┊A newly created Tortilla project. For more information, see https://github.com/Urigo/tortilla.
+┊ ┊4┊
+┊ ┊5┊[{]: <helper> (nav_step)
+┊ ┊6┊
+┊ ┊7┊
+┊ ┊8┊
+┊ ┊9┊[}]: #🚫↵
```

##### Added package.json
```diff
@@ -0,0 +1,5 @@
+┊ ┊1┊{
+┊ ┊2┊  "name": "tortilla-project",
+┊ ┊3┊  "description": "A newly created Tortilla project",
+┊ ┊4┊  "private": true
+┊ ┊5┊}
```

[}]: #