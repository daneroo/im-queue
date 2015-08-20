/**
 * @jsx React.DOM
 */

var socket = io.connect();


var Gauge = React.createClass({
  render: function(){
    var cx = React.addons.classSet;
    var classes = cx({
      'engine': this.props.gauge.engine,
    });
    return(
      <div className={classes}>
        Engine: {this.props.gauge.engine} &nbsp;
        Rate: {this.props.gauge.value.toFixed(0)}
      </div>
    )
  }
});

function mapObject(object, callback) {
  return Object.keys(object).map(function (key) {
    return callback(key, object[key]);
  });
}
var GaugeSet = React.createClass({
  render: function(){
    var renderGauge = function(key,gauge){
      return <Gauge key={key} gauge={gauge} />
    }
    return (
      <div className="section">
        <h2> Gauges: </h2>
        <ul className="gauges">
          { mapObject(this.props.gauges,renderGauge)}
        </ul>
      </div>
    );
  }
});

var Message = React.createClass({
  render: function(){
    var cx = React.addons.classSet;
    var classes = cx({
      'odd': this.props.message.id%2,
    });
    return(
      <li className={classes}>
        {this.props.message.stamp} : {this.props.message.msg}
      </li>
    )
  }
});

var MessageList = React.createClass({
  render: function(){
    var renderMessage = function(message){
      return <Message key={message.id} message={message} />
    }
    return (
      <div className="section">
        <h2> Messages: </h2>
        <ul className="messages">
          { this.props.messages.map(renderMessage)}
        </ul>
      </div>
    );
  }
});



var uniqueId=999;
var ChatApp = React.createClass({

  getInitialState: function(){

    socket.on('info', this.messageReceive);
    socket.on('gauge', this.valueReceive);

    return {
      gauges:{},
      messages: []
    };
  },

  valueReceive: function(opts){
    this.state.gauges[opts.engine]=opts;

    this.messageReceive({
      msg: JSON.stringify(opts)
    });
  },
  messageReceive: function(message){
    console.log('message',message);
    var maxMessages = 10;
    var messages = this.state.messages;
    message.id = uniqueId++;
    message.stamp = new Date().toISOString();

    messages.push(message);
    while (messages.length>maxMessages){
      messages.shift();
    }
    this.forceUpdate();
  },

  render : function(){
    return (
      <div>
        <GaugeSet gauges={this.state.gauges} />
        <MessageList messages={this.state.messages} />
      </div>
    );
  }
});

React.render(<ChatApp />, document.getElementById('content'));


