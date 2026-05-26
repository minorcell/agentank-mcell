// Persistent hunting memory
var _huntTarget = null;

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var myDir = me.tank.direction;
  var enemyTank = enemy.tank;
  var enemyBullet = enemy.bullet;
  var map = game.map;

  // ===== PRIORITY 1: DODGE =====
  if (enemyBullet && isBulletComing(myPos, enemyBullet.position, enemyBullet.direction)) {
    var evade = perpOpen(myPos, enemyBullet.direction, map);
    if (evade) {
      moveToward(me, myDir, myPos, add(myPos, delta(evade)));
      return;
    }
    var fwd = add(myPos, delta(myDir));
    if (isOpen(fwd, map)) { me.go(); return; }
    me.turn("right");
    return;
  }

  // ===== PRIORITY 2: COMBAT =====
  if (enemyTank) {
    var ePos = enemyTank.position;
    _huntTarget = ePos;
    var dist = Math.abs(myPos[0] - ePos[0]) + Math.abs(myPos[1] - ePos[1]);
    var aligned = isAligned(myPos, ePos);

    if (aligned && canShoot(myPos, ePos, map)) {
      var aimDir = directionTo(myPos, ePos);
      if (myDir !== aimDir) {
        me.turn(turnDirection(myDir, aimDir));
        return;
      }
      // Freeze combo: only at close range where bullet arrives before freeze expires
      if (!me.bullet && dist <= 5 && me.skill.remainingCooldownFrames === 0) {
        me.freeze();
        return;
      }
      if (!me.bullet) {
        me.fire();
        return;
      }
      // Bullet in flight, advance
      var fwd = add(myPos, delta(myDir));
      if (isOpen(fwd, map)) { me.go(); return; }
      me.turn("right");
      return;
    }

    // Pathfind toward enemy
    var step = nextStep(myPos, ePos, map);
    if (step) {
      moveToward(me, myDir, myPos, step);
      return;
    }
  }

  // ===== PRIORITY 3: HUNT last known enemy =====
  if (_huntTarget) {
    var step = nextStep(myPos, _huntTarget, map);
    if (step) {
      moveToward(me, myDir, myPos, step);
      return;
    }
  }

  // ===== PRIORITY 4: STAR =====
  if (game.star) {
    var step = nextStep(myPos, game.star, map);
    if (step) {
      moveToward(me, myDir, myPos, step);
      return;
    }
  }

  // ===== PRIORITY 5: EXPLORE (center) =====
  var cx = Math.floor(map.length / 2);
  var cy = Math.floor((map[0] ? map[0].length : 15) / 2);
  var step = nextStep(myPos, [cx, cy], map);
  if (step) {
    moveToward(me, myDir, myPos, step);
    return;
  }

  // ===== PRIORITY 6: PATROL =====
  patrol(me, myDir, myPos, map);
}

function isBulletComing(myPos, bulletPos, bulletDir) {
  var dx = bulletPos[0] - myPos[0];
  var dy = bulletPos[1] - myPos[1];
  if (dx === 0 && dy !== 0) {
    return (bulletDir === "down" && dy < 0) || (bulletDir === "up" && dy > 0);
  }
  if (dy === 0 && dx !== 0) {
    return (bulletDir === "right" && dx < 0) || (bulletDir === "left" && dx > 0);
  }
  return false;
}

function perpOpen(pos, dir, map) {
  var dirs = (dir === "up" || dir === "down") ? ["left", "right"] : ["up", "down"];
  for (var i = 0; i < dirs.length; i++) {
    if (isOpen(add(pos, delta(dirs[i])), map)) return dirs[i];
  }
  return null;
}

function moveToward(me, currentDir, from, to) {
  var dir = directionTo(from, to);
  if (currentDir === dir) {
    me.go();
  } else {
    me.turn(turnDirection(currentDir, dir));
  }
}

function patrol(me, currentDir, position, map) {
  var forward = add(position, delta(currentDir));
  if (isOpen(forward, map)) {
    me.go();
  } else {
    me.turn("right");
  }
}

function nextStep(start, goal, map) {
  var queue = [{ pos: start, first: null }];
  var seen = {};
  seen[key(start)] = true;

  for (var head = 0; head < queue.length; head++) {
    var item = queue[head];
    if (samePos(item.pos, goal)) return item.first;

    var dirs = ["up", "right", "down", "left"];
    for (var i = 0; i < dirs.length; i++) {
      var next = add(item.pos, delta(dirs[i]));
      var k = key(next);
      if (seen[k] || !isOpen(next, map)) continue;
      seen[k] = true;
      queue.push({ pos: next, first: item.first || next });
    }
  }
  return null;
}

function canShoot(a, b, map) {
  if (a[0] !== b[0] && a[1] !== b[1]) return false;
  var dir = directionTo(a, b);
  var step = delta(dir);
  var pos = add(a, step);
  while (!samePos(pos, b)) {
    if (!isOpen(pos, map)) return false;
    pos = add(pos, step);
  }
  return true;
}

function isAligned(a, b) {
  return a && b && (a[0] === b[0] || a[1] === b[1]);
}

function directionTo(a, b) {
  if (b[0] > a[0]) return "right";
  if (b[0] < a[0]) return "left";
  if (b[1] > a[1]) return "down";
  return "up";
}

function turnDirection(currentDir, targetDir) {
  var dirs = ["up", "right", "down", "left"];
  var current = dirs.indexOf(currentDir);
  var target = dirs.indexOf(targetDir);
  if (current < 0 || target < 0) return "right";
  var diff = (target - current + 4) % 4;
  return diff === 3 ? "left" : "right";
}

function delta(dir) {
  if (dir === "up") return [0, -1];
  if (dir === "right") return [1, 0];
  if (dir === "down") return [0, 1];
  return [-1, 0];
}

function add(pos, d) {
  return [pos[0] + d[0], pos[1] + d[1]];
}

function isOpen(pos, map) {
  if (!map[pos[0]]) return false;
  var cell = map[pos[0]][pos[1]];
  return cell && cell !== "x" && cell !== "m";
}

function samePos(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function key(pos) {
  return pos[0] + "," + pos[1];
}
