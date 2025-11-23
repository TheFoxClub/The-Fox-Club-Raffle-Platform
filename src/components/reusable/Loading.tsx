import React from "react";

const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="container">
        <div className="top"></div>
        <div className="inner-oval">
          <div className="circle1"></div>
          <div className="circle2"></div>
          <div className="circle3"></div>
        </div>
        {/* {!wallet?.adapter?.connected && <h3 className="mt-5">Please connect your wallet to access our Site</h3>} */}
      </div>
    </div>
  );
};

export default Loading;
