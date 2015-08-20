/**
 * @jsx React.DOM
 */

var socket = io.connect();


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

    return {messages:[]};
  },

  valueReceive: function(opts){
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
        <MessageList messages={this.state.messages} />
      </div>
    );
  }
});

React.render(<ChatApp />, document.getElementById('content'));


