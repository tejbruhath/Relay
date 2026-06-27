# redis-py guide (Python)

```json metadata
{
  "title": "redis-py guide (Python)",
  "description": "Connect your Python application to a Redis database",
  "categories": ["docs","develop","stack","oss","rs","rc","oss","kubernetes","clients"],
  "tableOfContents": {"sections":[{"id":"install","title":"Install"},{"id":"connect-and-test","title":"Connect and test"},{"id":"more-information","title":"More information"}]}

,
  "codeExamples": []
}
```
[redis-py](https://github.com/redis/redis-py) is the Python client for Redis. 
The sections below explain how to install `redis-py` and connect your application
to a Redis database.

`redis-py` requires a running Redis server. See [here](https://redis.io/docs/latest/operate/oss_and_stack/install/) for Redis Open Source installation instructions.

You can also access Redis with an object-mapping client interface. See
[RedisOM for Python](https://redis.io/docs/latest/integrate/redisom-for-python)
for more information.

## Install

To install `redis-py`, enter:

```bash
pip install redis
```

For faster performance, install Redis with [`hiredis`](https://github.com/redis/hiredis) support. This provides a compiled response parser, and for most cases requires zero code changes. By default, if `hiredis` >= 1.0 is available, `redis-py` attempts to use it for response parsing.


The Python `distutils` packaging scheme is no longer part of Python 3.12 and greater. If you're having difficulties getting `redis-py` installed in a Python 3.12 environment, consider updating to a recent release of `redis-py`.


```bash
pip install redis[hiredis]
```

## Connect and test

Connect to localhost on port 6379, set a value in Redis, and retrieve it. All responses are returned as bytes in Python. To receive decoded strings, set `decode_responses=True`. For more connection options, see [these examples](https://redis.readthedocs.io/en/stable/examples.html).



Store and retrieve a simple string.



Store and retrieve a dict.



Close the connection when you're done.



## More information

The [`redis-py`](https://redis.readthedocs.io/en/stable/index.html) website
has a [command reference](https://redis.readthedocs.io/en/stable/commands.html)
and some [tutorials](https://redis.readthedocs.io/en/stable/examples.html) for
various tasks. There are also some examples in the
[GitHub repository](https://github.com/redis/redis-py) for `redis-py`.
 
See also the other pages in this section for more information and examples:
