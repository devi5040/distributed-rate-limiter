local cost = tonumber(ARGV[3])
local count = redis.call('INCRBY', KEYS[1], cost)
if(count == cost) then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
end
local ttl = redis.call('TTL', KEYS[1])
if(count>tonumber(ARGV[1])) then
    return {0,0, ttl}
end
return {1, tonumber(ARGV[1])-count, ttl}